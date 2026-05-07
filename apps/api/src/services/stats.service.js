function createStatsSnapshot(record) {
  return {
    code: record.code,
    url: record.url,
    clicks: record.clicks,
    createdAt: record.createdAt
  };
}

module.exports = {
  createStatsSnapshot
};

