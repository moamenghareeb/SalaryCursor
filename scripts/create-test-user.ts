import prisma from '../lib/prisma'
import { hash } from 'bcryptjs'

async function createTestUser() {
  const hashedPassword = await hash('testpassword123', 10)
  
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      password: hashedPassword
    }
  })

  console.log('Test user created:', user)
}

createTestUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 