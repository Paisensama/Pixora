import { getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { firebaseConfig } from './constants/firebase';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let auth;
if (getApps().length) {
  auth = getAuth();
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
