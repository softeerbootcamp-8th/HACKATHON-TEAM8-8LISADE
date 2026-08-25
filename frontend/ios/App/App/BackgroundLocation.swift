import Capacitor
import CoreLocation
import Foundation
import UserNotifications
import WebKit

private let sessionCookieName = "JSESSIONID"

private final class SessionCookieStore {
    private let nativeStore = HTTPCookieStorage.shared
    private let webStore = WKWebsiteDataStore.default().httpCookieStore

    func syncFromWebView(for url: URL, completion: @escaping (Bool) -> Void) {
        webStore.getAllCookies { [nativeStore] cookies in
            let session = cookies.first { $0.name == sessionCookieName && $0.matches(url) }
            nativeStore.cookies?
                .filter { $0.name == sessionCookieName && $0.matches(url) }
                .forEach(nativeStore.deleteCookie)

            if let session {
                nativeStore.setCookie(session)
            }
            completion(session != nil)
        }
    }

    func syncResponse(_ response: HTTPURLResponse, for url: URL) {
        let headers = response.allHeaderFields.reduce(into: [String: String]()) { result, field in
            guard let key = field.key as? String, let value = field.value as? String else { return }
            result[key] = value
        }
        HTTPCookie.cookies(withResponseHeaderFields: headers, for: url)
            .filter { $0.name == sessionCookieName }
            .forEach { cookie in
                nativeStore.setCookie(cookie)
                webStore.setCookie(cookie)
            }
    }

    func expire(for url: URL?, completion: @escaping () -> Void) {
        nativeStore.cookies?
            .filter { $0.name == sessionCookieName && (url == nil || $0.matches(url!)) }
            .forEach(nativeStore.deleteCookie)

        webStore.getAllCookies { [webStore] cookies in
            let sessions = cookies.filter {
                $0.name == sessionCookieName && (url == nil || $0.matches(url!))
            }
            guard !sessions.isEmpty else {
                DispatchQueue.main.async(execute: completion)
                return
            }

            let group = DispatchGroup()
            sessions.forEach { cookie in
                group.enter()
                webStore.delete(cookie) { group.leave() }
            }
            group.notify(queue: .main, execute: completion)
        }
    }

    func hasSession(for url: URL?) -> Bool {
        guard let url else { return false }
        return nativeStore.cookies(for: url)?.contains { $0.name == sessionCookieName } == true
    }
}

private extension HTTPCookie {
    func matches(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        let cookieDomain = domain.lowercased().trimmingCharacters(in: CharacterSet(charactersIn: "."))
        guard host == cookieDomain || host.hasSuffix(".\(cookieDomain)") else { return false }

        let requestPath = url.path.isEmpty ? "/" : url.path
        let cookiePath = path.isEmpty ? "/" : path
        let pathMatches = requestPath == cookiePath ||
            requestPath.hasPrefix(cookiePath.hasSuffix("/") ? cookiePath : "\(cookiePath)/")
        return pathMatches && (expiresDate == nil || expiresDate! > Date())
    }
}

private enum TrackingFailure: Error {
    case invalidEndpoint
    case locationDisabled
    case permissionDenied
    case sessionMissing

    var code: String {
        switch self {
        case .invalidEndpoint: "INVALID_ENDPOINT"
        case .locationDisabled: "LOCATION_DISABLED"
        case .permissionDenied: "PERMISSION_DENIED"
        case .sessionMissing: "SESSION_MISSING"
        }
    }

    var message: String {
        switch self {
        case .invalidEndpoint: "HTTPS 위치 API 주소가 필요합니다."
        case .locationDisabled: "기기 위치 서비스가 꺼져 있습니다."
        case .permissionDenied: "위치 또는 알림 권한이 거부되었습니다."
        case .sessionMissing: "WebView에 로그인 세션이 없습니다."
        }
    }
}

private final class BackgroundLocationManager: NSObject, CLLocationManagerDelegate, UNUserNotificationCenterDelegate {
    static let shared = BackgroundLocationManager()

    private let cookieStore = SessionCookieStore()
    private let locationManager = CLLocationManager()
    private let notificationCenter = UNUserNotificationCenter.current()
    private lazy var session: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.httpCookieStorage = HTTPCookieStorage.shared
        configuration.httpShouldSetCookies = true
        configuration.timeoutIntervalForRequest = 10
        configuration.timeoutIntervalForResource = 10
        return URLSession(configuration: configuration)
    }()
    private var endpoint: URL?
    private var pendingStart: ((Result<Void, TrackingFailure>) -> Void)?
    private var lastSentAt: Date?
    private var uploading = false
    private(set) var tracking = false
    private(set) var reason: String?

    override private init() {
        super.init()
        locationManager.delegate = self
        notificationCenter.delegate = self
    }

    func syncSession(endpoint: String, completion: @escaping (Result<Void, TrackingFailure>) -> Void) {
        guard let url = URL(string: endpoint),
              url.scheme == "https",
              url.host != nil,
              url.user == nil,
              url.password == nil else {
            completion(.failure(.invalidEndpoint))
            return
        }

        cookieStore.syncFromWebView(for: url) { [weak self] available in
            DispatchQueue.main.async {
                guard available else {
                    completion(.failure(.sessionMissing))
                    return
                }
                self?.endpoint = url
                self?.reason = nil
                completion(.success(()))
            }
        }
    }

    func expireSession(completion: @escaping () -> Void) {
        stop()
        cookieStore.expire(for: endpoint) { [weak self] in
            self?.endpoint = nil
            self?.reason = nil
            completion()
        }
    }

    func start(completion: @escaping (Result<Void, TrackingFailure>) -> Void) {
        guard cookieStore.hasSession(for: endpoint) else {
            completion(.failure(.sessionMissing))
            return
        }
        guard CLLocationManager.locationServicesEnabled() else {
            completion(.failure(.locationDisabled))
            return
        }

        requireNotificationPermission { [weak self] granted in
            DispatchQueue.main.async {
                guard let self else { return }
                guard granted else {
                    completion(.failure(.permissionDenied))
                    return
                }
                self.startAfterNotificationPermission(completion)
            }
        }
    }

    func stop() {
        locationManager.stopUpdatingLocation()
        tracking = false
        uploading = false
        pendingStart = nil
        lastSentAt = nil
    }

    func hasSession() -> Bool {
        cookieStore.hasSession(for: endpoint)
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard let completion = pendingStart else { return }
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            pendingStart = nil
            beginLocationUpdates()
            completion(.success(()))
        case .denied, .restricted:
            pendingStart = nil
            completion(.failure(.permissionDenied))
        case .notDetermined:
            break
        @unknown default:
            pendingStart = nil
            completion(.failure(.permissionDenied))
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard tracking, !uploading, let location = locations.last else { return }
        if let lastSentAt, Date().timeIntervalSince(lastSentAt) < 30 { return }
        lastSentAt = Date()
        uploading = true
        send(location)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // 일시적인 GPS 오류는 다음 위치 갱신에서 복구한다. 위치 값은 로그에 남기지 않는다.
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    private func requireNotificationPermission(completion: @escaping (Bool) -> Void) {
        notificationCenter.getNotificationSettings { [notificationCenter] settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                completion(true)
            case .notDetermined:
                notificationCenter.requestAuthorization(options: [.alert, .sound]) { granted, _ in
                    completion(granted)
                }
            case .denied:
                completion(false)
            @unknown default:
                completion(false)
            }
        }
    }

    private func startAfterNotificationPermission(_ completion: @escaping (Result<Void, TrackingFailure>) -> Void) {
        switch locationManager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            beginLocationUpdates()
            completion(.success(()))
        case .notDetermined:
            pendingStart = completion
            locationManager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            completion(.failure(.permissionDenied))
        @unknown default:
            completion(.failure(.permissionDenied))
        }
    }

    private func beginLocationUpdates() {
        reason = nil
        tracking = true
        lastSentAt = nil
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = kCLDistanceFilterNone
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.showsBackgroundLocationIndicator = true
        locationManager.startUpdatingLocation()
    }

    private func send(_ location: CLLocation) {
        guard let endpoint else {
            sessionExpired()
            return
        }

        cookieStore.syncFromWebView(for: endpoint) { [weak self] available in
            guard let self else { return }
            guard available else {
                DispatchQueue.main.async { self.sessionExpired() }
                return
            }

            var request = URLRequest(url: endpoint)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: [
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude,
                "accuracy": location.horizontalAccuracy,
                "recordedAt": ISO8601DateFormatter().string(from: location.timestamp)
            ])

            self.session.dataTask(with: request) { [weak self] _, response, _ in
                guard let self else { return }
                DispatchQueue.main.async {
                    self.uploading = false
                    if let response = response as? HTTPURLResponse {
                        if response.statusCode == 401 {
                            self.sessionExpired()
                        } else {
                            self.cookieStore.syncResponse(response, for: endpoint)
                        }
                    }
                }
            }.resume()
        }
    }

    private func sessionExpired() {
        guard tracking || endpoint != nil else { return }
        stop()
        reason = "SESSION_EXPIRED"
        let expiredEndpoint = endpoint
        endpoint = nil
        cookieStore.expire(for: expiredEndpoint) {}

        let content = UNMutableNotificationContent()
        content.title = "로그인이 만료되었습니다"
        content.body = "위치 수집을 중지했습니다. 다시 로그인해 주세요."
        content.sound = .default
        notificationCenter.add(UNNotificationRequest(
            identifier: "background-location-session-expired",
            content: content,
            trigger: nil
        ))
    }
}

@objc(BackgroundLocationPlugin)
final class BackgroundLocationPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "BackgroundLocationPlugin"
    let jsName = "BackgroundLocation"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "expireSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startTracking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopTracking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise)
    ]

    private let manager = BackgroundLocationManager.shared

    @objc func syncSession(_ call: CAPPluginCall) {
        manager.syncSession(endpoint: call.getString("locationEndpoint") ?? "") { [weak self] result in
            switch result {
            case .success:
                call.resolve(self?.status() ?? [:])
            case .failure(let failure):
                call.reject(failure.message, failure.code)
            }
        }
    }

    @objc func expireSession(_ call: CAPPluginCall) {
        manager.expireSession { [weak self] in call.resolve(self?.status() ?? [:]) }
    }

    @objc func startTracking(_ call: CAPPluginCall) {
        manager.start { [weak self] result in
            switch result {
            case .success:
                call.resolve(self?.status() ?? [:])
            case .failure(let failure):
                call.reject(failure.message, failure.code)
            }
        }
    }

    @objc func stopTracking(_ call: CAPPluginCall) {
        manager.stop()
        call.resolve(status())
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve(status())
    }

    private func status() -> JSObject {
        var status: JSObject = [
            "supported": true,
            "tracking": manager.tracking,
            "sessionAvailable": manager.hasSession()
        ]
        if let reason = manager.reason {
            status["reason"] = reason
        }
        return status
    }
}
