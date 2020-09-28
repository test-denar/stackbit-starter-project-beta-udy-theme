const htmlmin = require("html-minifier");

const collections = require('../_config/collections.json');

const { format } = require('date-fns');

const { getProperty } = require('./get');

const { memoize, findBySlug } = require('./memo');

const { chunk } = require('./chunk');

module.exports = function (eleventyConfig) {

  eleventyConfig.addCollection("memoized", function (collection) {
    return memoize(collection.getAll());
  });


  for (let collectionId in collections) {
    const collection = collections[collectionId];

    if (collection.paginationLimit) {
      eleventyConfig.addCollection(collectionId + "_paged", function (collectionApi) {

        const newCollections = {}

        let items = collectionApi.getFilteredByTag(collection.collection);

        let limit = 0;

        if (collection.query && collection.query.limit) {
          limit = collection.query.limit;
        }
        if (collection.paginationLimit) {
          limit = collection.paginationLimit;
          // Create pagination Files
        }

        if (collection.query && collection.query.fields) {
          for (let field of collection.query.fields) {
            const rawItems = items;
            if (!field.value.includes("DYN_CONTEXT")) {
              items = items.filter(item => {
                const value = getProperty(item.data, field.fieldPath, "");
                try {
                  switch (field.operatorName) {
                    case "eq":
                      return value == field.value;
                    case "gt":
                      return value > field.value;
                    case "gte":
                      return value >= field.value;
                    case "lt":
                      return value < field.value;
                    case "lte":
                      return value <= field.value;
                    case "ne":
                      return value != field.value;
                    case "in":
                      return value.includes(field.value);
                    case "nin":
                      return !value.includes(field.value);
                  }
                } catch (e) {
                  return false;
                }
                return false;
              });
            } else {

              rawItems.forEach(item => {
                const a = getProperty(item.data, field.fieldPath, undefined);
                if (a) {
                  const index = field.fieldPath + "_" + a;
                  if (!newCollections[index]) {
                    newCollections[index] = []
                  }
                  newCollections[index].push(item);
                }
              });
            }
          }
        }
        if (collection.query && collection.query.sort) {
          for (let sortType of collection.query.sort) {
            let neg = sortType.startsWith("-");
            const fieldPath = sortType.startsWith("-") ? sortType.substring(1) : sortType;

            items = items.sort((a, b) => {
              const aField = getProperty(a.data, fieldPath, "");
              const bField = getProperty(b.data, fieldPath, "");

              if (neg) {
                return aField > bField ? -1 : 1;
              } else {
                return aField > bField ? 1 : -1;
              }
            });
          }
        }

        newCollections['main'] = items;

        const pagedCollections = []

        for (let cid in newCollections) {
          const chunks = chunk(newCollections[cid], collection.paginationLimit);
          const max = chunks.length - 1;
          chunks.forEach((c, i) => {
            pagedCollections.push({
              permalink: `pagination/${collectionId}-${cid}/page-${i + 1}.json`,
              prev: i > 0 ? `pagination/${collectionId}-${cid}/page-${i}.json` : "",
              next: i < max ? `pagination/${collectionId}-${cid}/page-${i + 2}.json` : "",
              items: c
            });
          })

        }

        return pagedCollections;
      })
    }

    eleventyConfig.addCollection(collectionId, function (collectionApi) {

      const newCollections = {}

      let items = collectionApi.getFilteredByTag(collection.collection);

      let limit = 0;

      if (collection.query && collection.query.limit) {
        limit = collection.query.limit;
      }
      if (collection.paginationLimit) {
        limit = collection.paginationLimit;
        // Create pagination Files
      }

      if (collection.query && collection.query.fields) {
        for (let field of collection.query.fields) {
          const rawItems = items;
          if (!field.value.includes("DYN_CONTEXT")) {
            items = items.filter(item => {
              const value = getProperty(item.data, field.fieldPath, "");
              try {
                switch (field.operatorName) {
                  case "eq":
                    return value == field.value;
                  case "gt":
                    return value > field.value;
                  case "gte":
                    return value >= field.value;
                  case "lt":
                    return value < field.value;
                  case "lte":
                    return value <= field.value;
                  case "ne":
                    return value != field.value;
                  case "in":
                    return value.includes(field.value);
                  case "nin":
                    return !value.includes(field.value);
                }
              } catch (e) {
                return false;
              }
              return false;
            });
          } else {

            rawItems.forEach(item => {
              const a = getProperty(item.data, field.fieldPath, undefined);
              if (a) {
                const index = field.fieldPath + "_" + a;
                if (!newCollections[index]) {
                  newCollections[index] = []
                }
                newCollections[index].push(item);
              }
            });
          }
        }
      }
      if (collection.query && collection.query.sort) {
        for (let sortType of collection.query.sort) {
          let neg = sortType.startsWith("-");
          const fieldPath = sortType.startsWith("-") ? sortType.substring(1) : sortType;

          items = items.sort((a, b) => {
            const aField = getProperty(a.data, fieldPath, "");
            const bField = getProperty(b.data, fieldPath, "");

            if (neg) {
              return aField > bField ? -1 : 1;
            } else {
              return aField > bField ? 1 : -1;
            }
          });
        }
      }

      if (limit > 0) {
        const offset = collection.query ? collection.query.offset || 0 : 0;
        items = items.slice(offset, limit + offset)
      }

      newCollections['main'] = items;
      return newCollections;
    })
  }


  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (outputPath.endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true
      });
      return minified;
    }

    return content;
  });

  eleventyConfig.addLiquidShortcode("seo", function (seo) {
    let seoString = '';
    for (let key in seo) {
      switch (key) {
        case 'title':
          seoString += `<title>${seo.title}</title><meta property="og:title" content="${seo.title}" />`;
          break;
        case 'description':
          seoString += `<meta name="description" content="${seo.description}">`;
          break;
        default: {
          if (key == 'additional_tags') {
            seoString += seo.additional_tags;
          } else if (key.startsWith('og:')) {
            seoString += `<meta property="${key}" content="${seo[key]}">`;
          } else {
            seoString += `<meta name="${key}" content="${seo[key]}">`;
          }
          break;
        }
      }
    }

    return seoString;
  });

  eleventyConfig.addLiquidFilter('resolveReference', function (item, field, fieldType) {

    const itemField = item.data[field]
    let ref = {};
    if (itemField) {

      if (typeof itemField == "string") {
        ref = findBySlug(fieldType, itemField);
      }
    }

    return ref;
  })

  eleventyConfig.addLiquidFilter('resolveMultiReference', function (item, field, fieldType) {

    const itemField = item.data[field]
    let ref = [];
    if (itemField && Array.isArray(itemField)) {

      ref = itemField.map(e => findBySlug(fieldType, e));

    }

    return ref;
  })

  eleventyConfig.addLiquidFilter('getBySlug', function (type, slug) {
    return findBySlug(type, slug);
  })

  eleventyConfig.addLiquidFilter('getCurrentPageItem', function (page) {
    const [type, slug] = page.filePathStem.split('/').filter(e => !!e);
    return findBySlug(type, slug);
  })

  eleventyConfig.addLiquidFilter('json', function (value) {
    return JSON.stringify(value);
  });


  eleventyConfig.addLiquidFilter('filterBy', function (array, toFilter, field) {
    if (!Array.isArray(toFilter)) {
      toFilter = [toFilter];
    }
    if (!array) {
      return [];
    }
    return array.filter(item => {
      if (field in item) {
        let value = item[field];
        if (!Array.isArray(value)) {
          value = [value];
        }
        for (let f of toFilter) {
          if (value.includes(f)) {
            return true;
          }
        }
        return false;
      } else {
        return false;
      }
    });
  });

  eleventyConfig.addLiquidFilter('formatDate', function (date, formatString = "yyyy-MM-dd") {
    try {
      const d = new Date(date);
      return format(d, formatString);
    } catch (error) {
      const d = new Date(date);
      return format(d, "yyyy-MM-dd");
    }
  });

  eleventyConfig.addLiquidFilter('limit', function (array, limit, offset) {
    if (!array) {
      return [];
    }
    if (!offset || isNaN(offset)) {
      offset = 0;
    }

    return array.slice(offset, limit);

  });

};
