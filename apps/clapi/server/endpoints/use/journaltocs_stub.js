
// journaltocs use API
// https://github.com/ContentMine/node-journalTOCs

CLapi.addRoute('use/journaltocs', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a subset of the journaltocs API - stub in progress, does nothing yet.'} };
    }
  }
});
