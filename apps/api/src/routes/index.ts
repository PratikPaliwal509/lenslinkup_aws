import type { FastifyInstance } from 'fastify'
import authRoutes        from './auth/index.js'
import profileRoutes     from './profile/index.js'
import discoverRoutes    from './discover/index.js'
import connectionRoutes  from './connections/index.js'
import postRoutes        from './posts/index.js'
import adminRoutes         from './admin/index.js'
import notificationRoutes  from './notifications/index.js'
import subscriptionRoutes  from './subscription/index.js'
import reviewRoutes        from './reviews/index.js'
import serviceRoutes       from './services/index.js'
import crmRoutes           from './crm/index.js'
import todosRoutes         from './todos/index.js'

export default async function routes(fastify: FastifyInstance) {
  fastify.register(authRoutes,          { prefix: '/api/auth'          })
  fastify.register(profileRoutes,       { prefix: '/api/profile'       })
  fastify.register(discoverRoutes,      { prefix: '/api/discover'      })
  fastify.register(connectionRoutes,    { prefix: '/api/connections'   })
  fastify.register(postRoutes,          { prefix: '/api/posts'         })
  fastify.register(adminRoutes,         { prefix: '/api/admin'         })
  fastify.register(notificationRoutes,  { prefix: '/api/notifications' })
  fastify.register(subscriptionRoutes,  { prefix: '/api/subscription'  })
  fastify.register(reviewRoutes,        { prefix: '/api/reviews'        })
  fastify.register(serviceRoutes,       { prefix: '/api/services'       })
  fastify.register(crmRoutes,           { prefix: '/api/crm'            })
  fastify.register(todosRoutes,         { prefix: '/api/todos'          })

  // fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))
}
