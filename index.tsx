// File entrypoint aplikasi Expo, bertanggung jawab untuk mendaftarkan komponen root
// Import runtime Expo untuk mendukung Fast Refresh (termasuk di Web)
import '@expo/metro-runtime'; // Necessary for Fast Refresh on Web
import { registerRootComponent } from 'expo';
import { App } from './src/App';

// registerRootComponent memanggil AppRegistry.registerComponent('main', () => App)
// dan memastikan environment siap dipakai baik di Expo Go maupun build native
registerRootComponent(App);
