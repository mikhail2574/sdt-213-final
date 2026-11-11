import type { Contact } from './useContacts'

/** Router state used by the directory "Message" button to open a new conversation. */
export interface MessagesLocationState {
  recipient?: Contact
}
