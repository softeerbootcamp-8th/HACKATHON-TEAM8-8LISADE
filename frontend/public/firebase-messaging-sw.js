importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCoDTNXXsIgh8DqzejhNaMqGjPuZ-FAVNs',
  authDomain: 'hackathon-team8-8lisade.firebaseapp.com',
  projectId: 'hackathon-team8-8lisade',
  storageBucket: 'hackathon-team8-8lisade.firebasestorage.app',
  messagingSenderId: '650681176784',
  appId: '1:650681176784:web:a549dfcafbcad4dd2944d5',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  if (title) {
    self.registration.showNotification(title, { body })
  }
})
