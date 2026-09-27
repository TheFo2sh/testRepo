import { dropBackoffice } from './mongo';

export default function globalTeardown() {
  dropBackoffice();
}
