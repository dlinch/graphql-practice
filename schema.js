const fetch = require('node-fetch');
const util = require('util');
const parseXML = util.promisify(require('xml2js').parseString);
require('dotenv').config()

const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList
} = require('graphql')

function translate(lang, str) {
  const apiKey = process.env.GOOGLE_TRANSLATE_KEY
  const url =
  'https://www.googleapis.com' +
  '/language/translate/v2' +
  '?key=' + apiKey +
  '&source=en' +
  '&target=' + lang +
  '&q=' + encodeURIComponent(str)

  return fetch(url)
    .then(response => response.json())
    .then(parsedResponse =>
      parsedResponse.data.translations[0].translatedText
    )

}

const BookType = new GraphQLObjectType({
  name: 'Book',
  description: '...',

  fields: () => ({
    title: {
      type: GraphQLString,
      args: {
        lang: {type: GraphQLString}
      },
      resolve: (xml, args) => {
        const title = xml.GoodreadsResponse.book[0].title[0]
        return args.lang ? translage(args.lang, title) : title
      }
    },
    isbn: {
      type: GraphQLString,
      resolve: xml => xml.GoodreadsResponse.book[0].isbn[0]
    }
  })
})

const AuthorType = new GraphQLObjectType({
  name: 'Author',
  description: '...',
  fields: () => ({
    name: {
      type: GraphQLString,
      resolve: xml =>
        xml.GoodreadsResponse.author[0].name[0]
    },
    books: {
      type: new GraphQLList(BookType),
      resolve: xml => {
        const ids = xml.GoodreadsResponse.author[0].books[0].book.map(elem => elem.id[0]._)
        return Promise.all(ids.map(id =>
          fetch(`https://www.goodreads.com/book/show/${id}.xml?key=${process.env.GOODREADS_KEY}`)
          .then(response => response.text())
          .then(parseXML)
        ))
      }
    }
  })
})
module.exports = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    description: '...',
    fields: () => ({
      author: {
        type: AuthorType,
        args: {
          id: { type: GraphQLInt }
        },
        resolve: (root, args) => fetch(
            `https://www.goodreads.com/author/show.xml?id=${args.id}&key=${process.env.GOODREADS_KEY}`
          )
          .then(response => response.text())
          .then(parseXML)
      }
    })
  })
})
