
// genenames.org API endpoint

// http://www.genenames.org/help/rest-web-service-help

CLapi.addRoute('use/genenames', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'use the genenames API which returns info about genes - stub in progress'} };
    }
  }
});

// idea here is we could use genenames API to maintain a dictionary of gene names for our own matching

// gene lists in ami: https://github.com/petermr/ami-plugin/tree/master/src/main/resources/org/xmlcml/ami2/plugins/gene

// phylotree species lists in ami: https://github.com/petermr/ami-plugin/tree/master/src/main/resources/org/xmlcml/ami2/plugins/phylotree/taxdump
