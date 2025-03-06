import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Database connectivity check
    await prisma.$connect()

    // Basic system
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect to the database' })
  }
} 