/**
 * Seed script for defense/demo environment
 * Populates database with realistic mock data for thesis defense
 *
 * Usage: npx tsx scripts/seed-defense-data.ts
 */

import { db } from '../db'
import {
  users,
  admins,
  learners,
  mentors,
  skillCategories,
  mentorSkills,
  mentorSkillCategories,
  mentorAvailability,
  bookingSessions,
  mentorReviews,
  creditPurchases,
  creditTransactions,
  notifications
} from '../db/schema'
import bcrypt from 'bcryptjs'

const SEED_PASSWORD = 'Password123!' // All users use this password for easy testing

async function main() {
  console.log('🌱 Starting defense data seeding...\n')

  try {
    // 1. Create Skill Categories
    console.log('📚 Creating skill categories...')
    const [programming, design, marketing, business, dataScience] = await db
      .insert(skillCategories)
      .values([
        { name: 'Programming & Development', description: 'Software development and coding skills' },
        { name: 'Design & Creative', description: 'UI/UX, graphic design, and creative skills' },
        { name: 'Digital Marketing', description: 'Marketing, SEO, and social media' },
        { name: 'Business & Management', description: 'Business strategy and management' },
        { name: 'Data Science & AI', description: 'Machine learning, data analysis, and AI' },
      ])
      .returning()
    console.log('✅ Created 5 skill categories\n')

    // 2. Create Admin User
    console.log('👤 Creating admin user...')
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 12)

    const [adminUser] = await db
      .insert(users)
      .values({
        email: 'admin@bridge-mentor.com',
        firstName: 'Admin',
        lastName: 'User',
        hashedPassword,
        role: 'admin',
        isActive: true,
        emailVerified: true,
      })
      .returning()

    await db.insert(admins).values({ userId: adminUser.id })
    console.log('✅ Admin created: admin@bridge-mentor.com')
    console.log(`   Password: ${SEED_PASSWORD}\n`)

    // 3. Create Learner Users
    console.log('👨‍🎓 Creating learner users...')
    const learnerData = [
      {
        email: 'learner1@demo.com',
        firstName: 'Maria',
        lastName: 'Santos',
        credits: 500
      },
      {
        email: 'learner2@demo.com',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        credits: 1000
      },
      {
        email: 'learner3@demo.com',
        firstName: 'Sofia',
        lastName: 'Reyes',
        credits: 250
      },
    ]

    const createdLearners = []
    for (const learner of learnerData) {
      const [user] = await db
        .insert(users)
        .values({
          email: learner.email,
          firstName: learner.firstName,
          lastName: learner.lastName,
          hashedPassword,
          role: 'learner',
          isActive: true,
          emailVerified: true,
        })
        .returning()

      await db.insert(learners).values({
        userId: user.id,
        creditsBalance: learner.credits,
      })

      createdLearners.push({ ...user, credits: learner.credits })
      console.log(`✅ Learner created: ${learner.email} (${learner.credits} credits)`)
    }
    console.log(`   Password (all): ${SEED_PASSWORD}\n`)

    // 4. Create Mentor Users
    console.log('👨‍🏫 Creating mentor users...')
    const mentorData = [
      {
        email: 'mentor1@demo.com',
        firstName: 'Carlos',
        lastName: 'Rodriguez',
        bio: 'Full-stack developer with 8+ years of experience in web development. Specialized in React, Node.js, and cloud architecture.',
        hourlyRate: 50,
        timezone: 'Asia/Manila',
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL'],
        categories: [programming.id],
        credits: 320,
      },
      {
        email: 'mentor2@demo.com',
        firstName: 'Ana',
        lastName: 'Martinez',
        bio: 'UI/UX designer with expertise in mobile and web design. Passionate about creating intuitive user experiences.',
        hourlyRate: 45,
        timezone: 'Asia/Manila',
        skills: ['Figma', 'UI/UX Design', 'Prototyping', 'User Research', 'Adobe XD'],
        categories: [design.id],
        credits: 560,
      },
      {
        email: 'mentor3@demo.com',
        firstName: 'Miguel',
        lastName: 'Garcia',
        bio: 'Data scientist specializing in machine learning and AI. Experienced in Python, TensorFlow, and data visualization.',
        hourlyRate: 60,
        timezone: 'Asia/Manila',
        skills: ['Python', 'Machine Learning', 'TensorFlow', 'Data Analysis', 'SQL'],
        categories: [dataScience.id],
        credits: 125,
      },
    ]

    const createdMentors = []
    for (const mentor of mentorData) {
      const [user] = await db
        .insert(users)
        .values({
          email: mentor.email,
          firstName: mentor.firstName,
          lastName: mentor.lastName,
          hashedPassword,
          role: 'mentor',
          isActive: true,
          emailVerified: true,
        })
        .returning()

      const [mentorRecord] = await db
        .insert(mentors)
        .values({
          userId: user.id,
          bio: mentor.bio,
          hourlyRate: mentor.hourlyRate,
          timezone: mentor.timezone,
          isApproved: true,
          creditsBalance: mentor.credits,
        })
        .returning()

      // Add skills
      for (const skill of mentor.skills) {
        await db.insert(mentorSkills).values({
          mentorId: mentorRecord.id,
          skillName: skill,
        })
      }

      // Add categories
      for (const categoryId of mentor.categories) {
        await db.insert(mentorSkillCategories).values({
          mentorId: mentorRecord.id,
          categoryId,
        })
      }

      // Add availability (Mon-Fri, 9 AM - 5 PM)
      const daysOfWeek = [1, 2, 3, 4, 5] // Monday to Friday
      for (const day of daysOfWeek) {
        await db.insert(mentorAvailability).values({
          mentorId: mentorRecord.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
        })
      }

      createdMentors.push({ ...user, mentorId: mentorRecord.id, credits: mentor.credits })
      console.log(`✅ Mentor created: ${mentor.email} (₱${mentor.hourlyRate}/hr, ${mentor.credits} credits earned)`)
    }
    console.log(`   Password (all): ${SEED_PASSWORD}\n`)

    // 5. Create Sample Sessions
    console.log('📅 Creating sample booking sessions...')

    // Completed session (learner1 + mentor1)
    const [completedSession] = await db
      .insert(bookingSessions)
      .values({
        learnerId: createdLearners[0].id,
        mentorId: createdMentors[0].mentorId,
        scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        duration: 60,
        creditsUsed: 50,
        mentorHourlyRate: 50,
        status: 'completed',
        topic: 'Introduction to React Hooks and State Management',
        learnerNotes: 'Need help understanding useEffect and custom hooks',
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000),
      })
      .returning()

    // Add review for completed session
    await db.insert(mentorReviews).values({
      sessionId: completedSession.id,
      learnerId: createdLearners[0].id,
      mentorId: createdMentors[0].mentorId,
      rating: 5,
      reviewText: 'Excellent mentor! Very patient and explained concepts clearly. Highly recommend!',
    })

    // Another completed session (learner2 + mentor2)
    const [completedSession2] = await db
      .insert(bookingSessions)
      .values({
        learnerId: createdLearners[1].id,
        mentorId: createdMentors[1].mentorId,
        scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        duration: 90,
        creditsUsed: 68,
        mentorHourlyRate: 45,
        status: 'completed',
        topic: 'Mobile App UI/UX Design Best Practices',
        learnerNotes: 'Working on a mobile app and need design guidance',
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5400000),
      })
      .returning()

    await db.insert(mentorReviews).values({
      sessionId: completedSession2.id,
      learnerId: createdLearners[1].id,
      mentorId: createdMentors[1].mentorId,
      rating: 5,
      reviewText: 'Ana is amazing! Great insights on design principles and very creative solutions.',
    })

    // Upcoming session (learner3 + mentor3)
    await db.insert(bookingSessions).values({
      learnerId: createdLearners[2].id,
      mentorId: createdMentors[2].mentorId,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      duration: 60,
      creditsUsed: 60,
      mentorHourlyRate: 60,
      status: 'confirmed',
      topic: 'Introduction to Machine Learning with Python',
      learnerNotes: 'Complete beginner looking to learn ML basics',
    })

    console.log('✅ Created 3 booking sessions (2 completed, 1 upcoming)\n')

    // 6. Create Credit Purchases
    console.log('💳 Creating credit purchase history...')

    const now = new Date()
    await db.insert(creditPurchases).values([
      {
        userId: createdLearners[0].id,
        amountCredits: 500,
        amountPaidUsd: '250.00',
        localAmount: '14000.00',
        localCurrency: 'PHP',
        provider: 'xendit',
        paymentStatus: 'completed',
        completedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        userId: createdLearners[1].id,
        amountCredits: 1000,
        amountPaidUsd: '500.00',
        localAmount: '28000.00',
        localCurrency: 'PHP',
        provider: 'xendit',
        paymentStatus: 'completed',
        completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    ])

    // Create credit transactions for purchases
    await db.insert(creditTransactions).values([
      {
        userId: createdLearners[0].id,
        type: 'purchase',
        direction: 'credit',
        amount: 500,
        balanceBefore: 0,
        balanceAfter: 500,
        description: 'Credit purchase - 500 credits for ₱14000',
      },
      {
        userId: createdLearners[1].id,
        type: 'purchase',
        direction: 'credit',
        amount: 1000,
        balanceBefore: 0,
        balanceAfter: 1000,
        description: 'Credit purchase - 1000 credits for ₱28000',
      },
    ])

    console.log('✅ Created 2 credit purchases\n')

    // 7. Create Sample Notifications
    console.log('🔔 Creating sample notifications...')

    await db.insert(notifications).values([
      {
        userId: createdLearners[0].id,
        type: 'session_completed',
        title: 'Session Completed',
        message: 'Your session with Carlos Rodriguez has been completed. Please leave a review!',
        relatedEntityType: 'session',
        relatedEntityId: completedSession.id,
        isRead: true,
      },
      {
        userId: createdMentors[0].id,
        type: 'session_completed',
        title: 'Session Completed',
        message: 'Session with Maria Santos completed successfully. Credits have been added to your balance.',
        relatedEntityType: 'session',
        relatedEntityId: completedSession.id,
        isRead: false,
      },
      {
        userId: createdLearners[2].id,
        type: 'session_upcoming',
        title: 'Upcoming Session',
        message: 'Your session with Miguel Garcia is scheduled in 2 days.',
        relatedEntityType: 'session',
        isRead: false,
      },
    ])

    console.log('✅ Created 3 notifications\n')

    // Summary
    console.log('\n🎉 Defense data seeding completed successfully!\n')
    console.log('═══════════════════════════════════════════════════════')
    console.log('📊 SEEDED DATA SUMMARY')
    console.log('═══════════════════════════════════════════════════════')
    console.log('👥 Users:')
    console.log('   • 1 Admin: admin@bridge-mentor.com')
    console.log('   • 3 Learners: learner1-3@demo.com')
    console.log('   • 3 Mentors: mentor1-3@demo.com')
    console.log('')
    console.log('🔐 All passwords: Password123!')
    console.log('')
    console.log('📚 Skill Categories: 5')
    console.log('📅 Sessions: 3 (2 completed, 1 upcoming)')
    console.log('⭐ Reviews: 2')
    console.log('💳 Purchases: 2')
    console.log('🔔 Notifications: 3')
    console.log('')
    console.log('💰 Credit Balances:')
    console.log('   Learners:')
    console.log('   • Maria Santos: 500 credits')
    console.log('   • Juan Dela Cruz: 1000 credits')
    console.log('   • Sofia Reyes: 250 credits')
    console.log('   Mentors:')
    console.log('   • Carlos Rodriguez: 320 credits')
    console.log('   • Ana Martinez: 560 credits')
    console.log('   • Miguel Garcia: 125 credits')
    console.log('═══════════════════════════════════════════════════════')
    console.log('\n✅ You can now login and test the application!')
    console.log('   Defense URL: https://bridge-mentor.vercel.app (after deployment)')
    console.log('   Local URL: http://localhost:3000\n')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
    throw error
  }
}

main()
  .then(() => {
    console.log('🏁 Seed script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
