import { dropCatalog } from './mongo';

export default function globalTeardown() {
  dropCatalog();
}
