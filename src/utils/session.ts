import { WebStorageAdapter } from './webStorage';

export default new WebStorageAdapter(() => sessionStorage);
