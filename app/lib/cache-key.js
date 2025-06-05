export const CACHE_KEYS = {
  accountType: "account-type",
  $getAccountType: function (id) {
    return `messageId-${id}`;
  },
};
