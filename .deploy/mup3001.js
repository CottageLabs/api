module.exports = {
  servers: {
    one: {
      host: "10.131.20.129",
      username: "cloo",
      pem: "~/.ssh/id_dsa"
    },
    two: {
      host: "10.131.11.72",
      username: "cloo",
      pem: "~/.ssh/id_dsa"
    }
  },

  meteor: {
    name: 'clapi3001',
    path: '../',
    servers: {
      one: {}, two: {}
    },
    docker: {
      image: 'abernix/meteord:base'
    },
    buildOptions: {
      serverOnly: true,
      allowIncompatibleUpdates: true,
    },
    env: {
      PORT: 3001,
      ROOT_URL: 'https://api.cottagelabs.com',
      MONGO_URL: 'mongodb://10.131.177.187:27017/clapi'
    },
    deployCheckWaitTime: 240
  }
};
