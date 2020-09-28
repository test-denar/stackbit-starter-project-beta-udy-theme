
      const filters = require('./_utils/filters.js');
      
      module.exports = function(eleventyConfig) {

        filters(eleventyConfig);

        eleventyConfig.addPassthroughCopy("static/**");
        
        return {
          dir: {
            input: "site",
            includes: "_views",
            output: "public"
          }
        };
      };