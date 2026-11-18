import { registerRootComponent } from 'expo';

import App from './App';
import { iniciarAnaliticas } from './src/utils/analiticas';

iniciarAnaliticas();
registerRootComponent(App);
