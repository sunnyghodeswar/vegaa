/**
 * Vegaa HTTP Client Example (Pure JavaScript)
 * --------------------------------------------
 * Demonstrates making external API calls using makeRequest()
 */

const { vegaa, route } = require('../dist/cjs/index.js')
const { httpClientPlugin } = require('../dist/cjs/plugins/httpClient.js')

async function main() {
  // Register HTTP client plugin
  await vegaa.plugin(httpClientPlugin, { timeout: 5000 })
  console.log('✅ HTTP client plugin registered')

  // GET request to external API
  route('/posts').get(async (makeRequest) => {
    const posts = await makeRequest()
      .url('https://jsonplaceholder.typicode.com/posts')
      .get()
      .json()
    
    return {
      total: posts.length,
      posts: posts.slice(0, 5) // Return first 5 posts
    }
  })

  // GET single post
  route('/posts/:id').get(async (id, makeRequest) => {
    const post = await makeRequest()
      .url(`https://jsonplaceholder.typicode.com/posts/${id}`)
      .get()
      .json()
    
    return post
  })

  // POST request to external API
  route('/create-post').post(async (body, makeRequest) => {
    const newPost = await makeRequest()
      .url('https://jsonplaceholder.typicode.com/posts')
      .post()
      .headers({ 'Content-Type': 'application/json' })
      .body(body)
      .json()
    
    return {
      message: 'Post created',
      post: newPost
    }
  })

  // PUT request
  route('/update-post/:id').put(async (params, body, makeRequest) => {
    const updatedPost = await makeRequest()
      .url(`https://jsonplaceholder.typicode.com/posts/${params.id}`)
      .put()
      .headers({ 'Content-Type': 'application/json' })
      .body(body)
      .json()
    
    return {
      message: 'Post updated',
      post: updatedPost
    }
  })

  // DELETE request
  route('/delete-post/:id').delete(async (id, makeRequest) => {
    await makeRequest()
      .url(`https://jsonplaceholder.typicode.com/posts/${id}`)
      .delete()
      .json()
    
    return {
      message: `Post ${id} deleted`
    }
  })

  // Multiple API calls
  route('/user-posts/:userId').get(async (userId, makeRequest) => {
    const [user, posts] = await Promise.all([
      makeRequest()
        .url(`https://jsonplaceholder.typicode.com/users/${userId}`)
        .get()
        .json(),
      makeRequest()
        .url(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`)
        .get()
        .json()
    ])
    
    return {
      user,
      posts,
      totalPosts: posts.length
    }
  })

  // Start server
  await vegaa.startVegaaServer({ port: 4000 })
  console.log('✅ Server running on http://localhost:4000')
  console.log('\n📖 Try these endpoints:')
  console.log('  GET  http://localhost:4000/posts')
  console.log('  GET  http://localhost:4000/posts/1')
  console.log('  GET  http://localhost:4000/user-posts/1')
  console.log('  POST http://localhost:4000/create-post (with JSON body)')
}

main().catch(err => {
  console.error('💥 Server failed:', err)
  process.exit(1)
})

