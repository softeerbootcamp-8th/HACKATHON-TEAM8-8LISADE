package com.palisade.travel.domain.geo.util;

import com.palisade.travel.domain.geo.entity.GeofencePoint;

import java.math.BigDecimal;
import java.util.List;

public final class GeofenceUtils {

    private GeofenceUtils() {
    }

    public static boolean contains(List<GeofencePoint> points, BigDecimal latitude, BigDecimal longitude) {
        if (points.size() < 3) {
            return false;
        }

        boolean inside = false;
        for (int current = 0, previous = points.size() - 1;
             current < points.size();
             previous = current++) {
            GeofencePoint start = points.get(previous);
            GeofencePoint end = points.get(current);

            if (isOnSegment(start, end, latitude, longitude)) {
                return true;
            }

            double startLatitude = start.getLatitude().doubleValue();
            double endLatitude = end.getLatitude().doubleValue();
            double targetLatitude = latitude.doubleValue();
            boolean crossesLatitude = (startLatitude > targetLatitude) != (endLatitude > targetLatitude);
            if (crossesLatitude) {
                double crossingLongitude = (end.getLongitude().doubleValue() - start.getLongitude().doubleValue())
                        * (targetLatitude - startLatitude) / (endLatitude - startLatitude)
                        + start.getLongitude().doubleValue();
                if (longitude.doubleValue() < crossingLongitude) {
                    inside = !inside;
                }
            }
        }
        return inside;
    }

    private static boolean isOnSegment(GeofencePoint start, GeofencePoint end,
                                       BigDecimal latitude, BigDecimal longitude) {
        BigDecimal crossProduct = longitude.subtract(start.getLongitude())
                .multiply(end.getLatitude().subtract(start.getLatitude()))
                .subtract(latitude.subtract(start.getLatitude())
                        .multiply(end.getLongitude().subtract(start.getLongitude())));

        return crossProduct.signum() == 0
                && longitude.compareTo(start.getLongitude().min(end.getLongitude())) >= 0
                && longitude.compareTo(start.getLongitude().max(end.getLongitude())) <= 0
                && latitude.compareTo(start.getLatitude().min(end.getLatitude())) >= 0
                && latitude.compareTo(start.getLatitude().max(end.getLatitude())) <= 0;
    }
}
