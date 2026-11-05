// Who can see a restaurant. Missing means published, for restaurants older than the
// field. "hidden" is the owner's choice; "suspended" is the admin's, and only an admin
// can lift it.
export const NON_PUBLIC_STATUSES = ["draft", "hidden", "suspended", "deleted"];

export const isPublicStatus = (status) => !NON_PUBLIC_STATUSES.includes(status);
