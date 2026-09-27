import { createStore, useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import { createUpdateHotelInfoClient, type HotelInfo, type UpdateHotelInfoClient } from '../api/backofficeClient';

export type UpdateHotelInfoStatus = 'idle' | 'submitting' | 'updated' | 'rejected' | 'error';

export const UPDATE_HOTEL_INFO_ERROR_MESSAGE = 'Hotel info could not be updated. Please try again.';

export interface UpdateHotelInfoState {
  /** Entered hotel ID; kept across submissions so a rejected update can be corrected. */
  hotelId: string;
  /** Entered city; kept across submissions so a rejected update can be corrected. */
  city: string;
  status: UpdateHotelInfoStatus;
  /** The updated HotelInfo; only set while `status` is `updated`. */
  hotelInfo: HotelInfo | null;
  /** The rejection reason or a display-safe failure message; only set while `status` is `rejected` or `error`. */
  error: string | null;
  setHotelId: (hotelId: string) => void;
  setCity: (city: string) => void;
  /** Submits the entered city for the entered hotel; ignored while a submission is pending. */
  submit: () => Promise<void>;
}

export type UpdateHotelInfoStore = StoreApi<UpdateHotelInfoState>;

export function createUpdateHotelInfoStore(
  client: UpdateHotelInfoClient = createUpdateHotelInfoClient(),
): UpdateHotelInfoStore {
  return createStore<UpdateHotelInfoState>()((set, get) => ({
    hotelId: '',
    city: '',
    status: 'idle',
    hotelInfo: null,
    error: null,
    setHotelId: (hotelId) => set({ hotelId }),
    setCity: (city) => set({ city }),
    submit: async () => {
      const { hotelId, city, status } = get();
      if (status === 'submitting' || hotelId.trim() === '') return;

      set({ status: 'submitting', hotelInfo: null, error: null });

      try {
        const result = await client(hotelId.trim(), city);
        if (result.kind === 'updated') {
          set({ status: 'updated', hotelInfo: result.hotelInfo, error: null });
        } else {
          set({ status: 'rejected', hotelInfo: null, error: result.reason });
        }
      } catch {
        set({ status: 'error', hotelInfo: null, error: UPDATE_HOTEL_INFO_ERROR_MESSAGE });
      }
    },
  }));
}

let updateHotelInfoStore = createUpdateHotelInfoStore();

/** Replaces the application-wide store, e.g. to inject a client in tests. */
export function configureUpdateHotelInfoClient(client: UpdateHotelInfoClient): UpdateHotelInfoStore {
  updateHotelInfoStore = createUpdateHotelInfoStore(client);
  return updateHotelInfoStore;
}

export function getUpdateHotelInfoStore(): UpdateHotelInfoStore {
  return updateHotelInfoStore;
}

/** React hook over the application-wide UpdateHotelInfo store. */
export function useUpdateHotelInfoStore<T>(selector: (state: UpdateHotelInfoState) => T): T {
  return useStore(updateHotelInfoStore, selector);
}
