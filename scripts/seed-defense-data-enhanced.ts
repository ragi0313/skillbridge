/**
 * Enhanced seed script for defense/demo environment
 * Populates database with realistic mock data including portfolio and LinkedIn links
 *
 * Usage: npx tsx scripts/seed-defense-data-enhanced.ts
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
  console.log('🌱 Starting enhanced defense data seeding...\n')

  try {
    // 1. Create Skill Categories
    console.log('📚 Creating skill categories...')
    const [programming, design, marketing, business, dataScience] = await db
      .insert(skillCategories)
      .values([
        {
          name: 'Programming & Development',
          description: 'Software development, web development, mobile apps, and coding skills'
        },
        {
          name: 'Design & Creative',
          description: 'UI/UX design, graphic design, web design, and creative skills'
        },
        {
          name: 'Digital Marketing',
          description: 'SEO, social media marketing, content marketing, and digital advertising'
        },
        {
          name: 'Business & Management',
          description: 'Business strategy, project management, leadership, and entrepreneurship'
        },
        {
          name: 'Data Science & AI',
          description: 'Machine learning, data analysis, artificial intelligence, and data visualization'
        },
      ])
      .returning()
    console.log('✅ Created 5 skill categories\n')

    // 2. Create Admin Users
    console.log('👤 Creating admin users...')
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 12)

    const adminData = [
      {
        email: 'admin@bridge-mentor.com',
        firstName: 'Admin',
        lastName: 'User',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
      },
      {
        email: 'admin2@bridge-mentor.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      },
    ]

    for (const admin of adminData) {
      const [adminUser] = await db
        .insert(users)
        .values({
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          hashedPassword,
          role: 'admin',
          isActive: true,
          emailVerified: true,
          profilePicture: admin.profilePicture,
        })
        .returning()

      await db.insert(admins).values({ userId: adminUser.id })
      console.log(`✅ Admin created: ${admin.email} (${admin.firstName} ${admin.lastName})`)
    }
    console.log(`   Password (all): ${SEED_PASSWORD}\n`)

    // 3. Create Learner Users
    console.log('👨‍🎓 Creating learner users...')
    const learnerData = [
      {
        email: 'maria.santos@demo.com',
        firstName: 'Maria',
        lastName: 'Santos',
        credits: 500,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
      },
      {
        email: 'juan.delacruz@demo.com',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        credits: 1000,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juan',
      },
      {
        email: 'sofia.reyes@demo.com',
        firstName: 'Sofia',
        lastName: 'Reyes',
        credits: 250,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia',
      },
      {
        email: 'mark.tan@demo.com',
        firstName: 'Mark',
        lastName: 'Tan',
        credits: 2500,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark',
      },
      {
        email: 'claire.lim@demo.com',
        firstName: 'Claire',
        lastName: 'Lim',
        credits: 3000,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claire',
      },
      {
        email: 'ryan.kim@demo.com',
        firstName: 'Ryan',
        lastName: 'Kim',
        credits: 1800,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan',
      },
      {
        email: 'jessica.wong@demo.com',
        firstName: 'Jessica',
        lastName: 'Wong',
        credits: 5000,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
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
          profilePicture: learner.profilePicture,
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

    // 4. Create Mentor Users with Portfolio and LinkedIn
    console.log('👨‍🏫 Creating mentor users with portfolios...')
    const mentorData = [
      {
        email: 'carlos.rodriguez@demo.com',
        firstName: 'Carlos',
        lastName: 'Rodriguez',
        bio: 'Full-stack developer with 8+ years of experience building scalable web applications. Specialized in React, Node.js, TypeScript, and cloud architecture. Former senior engineer at a leading tech startup. Passionate about teaching clean code principles and modern development practices.',
        hourlyRate: 50,
        timezone: 'Asia/Manila',
        skills: ['React', 'Node.js', 'TypeScript', 'Next.js', 'PostgreSQL', 'AWS', 'Docker', 'GraphQL'],
        categories: [programming.id],
        credits: 320,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
        linkedinUrl: 'https://www.linkedin.com/in/carlos-rodriguez-dev',
        portfolioUrl: 'https://carlos-rodriguez.dev',
        githubUrl: 'https://github.com/carlos-rodriguez',
        yearsOfExperience: 8,
      },
      {
        email: 'ana.martinez@demo.com',
        firstName: 'Ana',
        lastName: 'Martinez',
        bio: 'Award-winning UI/UX designer with 6+ years of experience creating beautiful and intuitive digital products. Specialized in mobile app design, user research, and design systems. Worked with Fortune 500 companies and innovative startups. Passionate about creating accessible and user-centered designs.',
        hourlyRate: 45,
        timezone: 'Asia/Manila',
        skills: ['Figma', 'UI/UX Design', 'Prototyping', 'User Research', 'Adobe XD', 'Design Systems', 'Wireframing', 'Mobile Design'],
        categories: [design.id],
        credits: 560,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
        linkedinUrl: 'https://www.linkedin.com/in/ana-martinez-design',
        portfolioUrl: 'https://ana-martinez.design',
        behanceUrl: 'https://www.behance.net/ana-martinez',
        yearsOfExperience: 6,
      },
      {
        email: 'miguel.garcia@demo.com',
        firstName: 'Miguel',
        lastName: 'Garcia',
        bio: 'Data scientist and machine learning engineer with 7+ years of experience in AI and analytics. PhD in Computer Science. Specialized in deep learning, natural language processing, and computer vision. Published researcher with multiple papers in top-tier conferences. Expert in Python, TensorFlow, and PyTorch.',
        hourlyRate: 60,
        timezone: 'Asia/Manila',
        skills: ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Data Analysis', 'Deep Learning', 'NLP', 'Computer Vision'],
        categories: [dataScience.id],
        credits: 125,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Miguel',
        linkedinUrl: 'https://www.linkedin.com/in/miguel-garcia-ml',
        portfolioUrl: 'https://miguel-garcia.ai',
        githubUrl: 'https://github.com/miguel-garcia-ml',
        yearsOfExperience: 7,
      },
      {
        email: 'isabella.cruz@demo.com',
        firstName: 'Isabella',
        lastName: 'Cruz',
        bio: 'Digital marketing strategist with 5+ years of experience helping brands grow online. Specialized in SEO, content marketing, social media strategy, and paid advertising. Managed campaigns for e-commerce, SaaS, and B2B companies. Data-driven approach with proven ROI results.',
        hourlyRate: 40,
        timezone: 'Asia/Manila',
        skills: ['SEO', 'Content Marketing', 'Social Media Marketing', 'Google Ads', 'Facebook Ads', 'Email Marketing', 'Analytics', 'Copywriting'],
        categories: [marketing.id],
        credits: 280,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Isabella',
        linkedinUrl: 'https://www.linkedin.com/in/isabella-cruz-marketing',
        portfolioUrl: 'https://isabella-cruz.marketing',
        yearsOfExperience: 5,
      },
      {
        email: 'david.lopez@demo.com',
        firstName: 'David',
        lastName: 'Lopez',
        bio: 'Product manager and business consultant with 10+ years of experience. Former PM at a FAANG company. Specialized in product strategy, roadmap planning, agile methodologies, and stakeholder management. Helped launch multiple successful products from 0 to 1. MBA from top business school.',
        hourlyRate: 55,
        timezone: 'Asia/Manila',
        skills: ['Product Management', 'Agile', 'Business Strategy', 'Roadmap Planning', 'Stakeholder Management', 'Market Research', 'OKRs', 'Leadership'],
        categories: [business.id],
        credits: 445,
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
        linkedinUrl: 'https://www.linkedin.com/in/david-lopez-pm',
        portfolioUrl: 'https://david-lopez.business',
        yearsOfExperience: 10,
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
          profilePicture: mentor.profilePicture,
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
          linkedinUrl: mentor.linkedinUrl,
          portfolioUrl: mentor.portfolioUrl,
          githubUrl: mentor.githubUrl || null,
          behanceUrl: (mentor as any).behanceUrl || null,
          yearsOfExperience: mentor.yearsOfExperience,
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

      createdMentors.push({ ...user, mentorId: mentorRecord.id, credits: mentor.credits, hourlyRate: mentor.hourlyRate })
      console.log(`✅ Mentor created: ${mentor.email}`)
      console.log(`   - Hourly rate: ₱${mentor.hourlyRate}/hr`)
      console.log(`   - Credits earned: ${mentor.credits}`)
      console.log(`   - Portfolio: ${mentor.portfolioUrl}`)
      console.log(`   - LinkedIn: ${mentor.linkedinUrl}`)
    }
    console.log(`   Password (all): ${SEED_PASSWORD}\n`)

    // 5. Create Sample Sessions with detailed notes
    console.log('📅 Creating sample booking sessions...')

    // Completed session 1 (learner Maria + mentor Carlos - React)
    const [completedSession1] = await db
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
        learnerNotes: 'Need help understanding useEffect, custom hooks, and best practices for state management in React applications. Working on a personal project and getting confused with the component lifecycle.',
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000),
      })
      .returning()

    // Add review for completed session 1
    await db.insert(mentorReviews).values({
      sessionId: completedSession1.id,
      learnerId: createdLearners[0].id,
      mentorId: createdMentors[0].mentorId,
      rating: 5,
      reviewText: 'Excellent mentor! Carlos is very patient and explained React concepts clearly. He provided great examples and helped me understand the differences between useEffect and useState. Highly recommend for anyone learning React!',
    })

    // Completed session 2 (learner Juan + mentor Ana - UI/UX)
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
        learnerNotes: 'Working on my first mobile app and need guidance on design principles, user flows, and creating an intuitive interface. Want to learn about mobile-specific design patterns.',
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5400000),
      })
      .returning()

    await db.insert(mentorReviews).values({
      sessionId: completedSession2.id,
      learnerId: createdLearners[1].id,
      mentorId: createdMentors[1].mentorId,
      rating: 5,
      reviewText: 'Ana is amazing! She gave me great insights on mobile design principles and showed me real examples from her portfolio. Very creative and practical solutions. The session was worth every credit!',
    })

    // Completed session 3 (learner Maria + mentor Miguel - Python basics)
    const [completedSession3] = await db
      .insert(bookingSessions)
      .values({
        learnerId: createdLearners[0].id,
        mentorId: createdMentors[2].mentorId,
        scheduledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        duration: 60,
        creditsUsed: 60,
        mentorHourlyRate: 60,
        status: 'completed',
        topic: 'Python Fundamentals and Data Analysis Basics',
        learnerNotes: 'Complete beginner in Python. Want to learn the basics and eventually move into data analysis. Need to understand variables, functions, and basic data structures.',
        completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 3600000),
      })
      .returning()

    await db.insert(mentorReviews).values({
      sessionId: completedSession3.id,
      learnerId: createdLearners[0].id,
      mentorId: createdMentors[2].mentorId,
      rating: 4,
      reviewText: 'Miguel is very knowledgeable and patient. The session was a bit fast-paced for a complete beginner, but he provided great resources and examples. Looking forward to more sessions!',
    })

    // Upcoming session 1 (learner Sofia + mentor Miguel - ML intro)
    await db.insert(bookingSessions).values({
      learnerId: createdLearners[2].id,
      mentorId: createdMentors[2].mentorId,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      duration: 60,
      creditsUsed: 60,
      mentorHourlyRate: 60,
      status: 'confirmed',
      topic: 'Introduction to Machine Learning with Python',
      learnerNotes: 'Interested in learning machine learning. Have basic Python knowledge. Want to understand ML concepts, algorithms, and how to get started with practical projects.',
    })

    // Upcoming session 2 (learner Juan + mentor Isabella - SEO basics)
    await db.insert(bookingSessions).values({
      learnerId: createdLearners[1].id,
      mentorId: createdMentors[3].mentorId,
      scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      duration: 60,
      creditsUsed: 40,
      mentorHourlyRate: 40,
      status: 'confirmed',
      topic: 'SEO Fundamentals for Small Business Websites',
      learnerNotes: 'Running a small online business and want to improve website visibility. Need to understand SEO basics, keyword research, and on-page optimization.',
    })

    console.log('✅ Created 5 booking sessions (3 completed, 2 upcoming)\n')

    // 6. Create Credit Purchases with realistic amounts
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
        completedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        paymentReference: 'XND-INV-' + Math.random().toString(36).substring(7).toUpperCase(),
      },
      {
        userId: createdLearners[1].id,
        amountCredits: 1000,
        amountPaidUsd: '500.00',
        localAmount: '28000.00',
        localCurrency: 'PHP',
        provider: 'xendit',
        paymentStatus: 'completed',
        completedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        paymentReference: 'XND-INV-' + Math.random().toString(36).substring(7).toUpperCase(),
      },
      {
        userId: createdLearners[2].id,
        amountCredits: 250,
        amountPaidUsd: '125.00',
        localAmount: '7000.00',
        localCurrency: 'PHP',
        provider: 'xendit',
        paymentStatus: 'completed',
        completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        paymentReference: 'XND-INV-' + Math.random().toString(36).substring(7).toUpperCase(),
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
        description: 'Credit purchase - 500 credits for ₱14,000',
      },
      {
        userId: createdLearners[1].id,
        type: 'purchase',
        direction: 'credit',
        amount: 1000,
        balanceBefore: 0,
        balanceAfter: 1000,
        description: 'Credit purchase - 1000 credits for ₱28,000',
      },
      {
        userId: createdLearners[2].id,
        type: 'purchase',
        direction: 'credit',
        amount: 250,
        balanceBefore: 0,
        balanceAfter: 250,
        description: 'Credit purchase - 250 credits for ₱7,000',
      },
    ])

    console.log('✅ Created 3 credit purchases\n')

    // 7. Create Sample Notifications
    console.log('🔔 Creating sample notifications...')

    await db.insert(notifications).values([
      {
        userId: createdLearners[0].id,
        type: 'session_completed',
        title: 'Session Completed',
        message: 'Your session with Carlos Rodriguez has been completed. Please leave a review!',
        relatedEntityType: 'session',
        relatedEntityId: completedSession1.id,
        isRead: true,
      },
      {
        userId: createdMentors[0].id,
        type: 'session_completed',
        title: 'Session Completed - Credits Earned',
        message: 'Session with Maria Santos completed successfully. 50 credits have been added to your balance.',
        relatedEntityType: 'session',
        relatedEntityId: completedSession1.id,
        isRead: false,
      },
      {
        userId: createdLearners[2].id,
        type: 'session_upcoming',
        title: 'Upcoming Session Reminder',
        message: 'Your session with Miguel Garcia is scheduled in 2 days. Make sure you have Python installed!',
        relatedEntityType: 'session',
        isRead: false,
      },
      {
        userId: createdMentors[1].id,
        type: 'review_received',
        title: 'New 5-Star Review!',
        message: 'Juan Dela Cruz left you a 5-star review for your recent session!',
        relatedEntityType: 'session',
        relatedEntityId: completedSession2.id,
        isRead: false,
      },
      {
        userId: createdLearners[1].id,
        type: 'session_confirmed',
        title: 'Session Confirmed',
        message: 'Your session with Isabella Cruz has been confirmed for ' + new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        relatedEntityType: 'session',
        isRead: true,
      },
    ])

    console.log('✅ Created 5 notifications\n')

    // Summary
    console.log('\n🎉 Enhanced defense data seeding completed successfully!\n')
    console.log('═══════════════════════════════════════════════════════════════════')
    console.log('📊 SEEDED DATA SUMMARY')
    console.log('═══════════════════════════════════════════════════════════════════')
    console.log('\n👥 Users:')
    console.log('   • 2 Admins: admin@bridge-mentor.com, admin2@bridge-mentor.com')
    console.log('   • 7 Learners: maria/juan/sofia/mark/claire/ryan/jessica@demo.com')
    console.log('   • 5 Mentors: carlos/ana/miguel/isabella/david@demo.com')
    console.log('')
    console.log('🔐 All passwords: Password123!')
    console.log('')
    console.log('📚 Skill Categories: 5')
    console.log('🎯 Skills: 40+ skills across mentors')
    console.log('📅 Sessions: 5 (3 completed, 2 upcoming)')
    console.log('⭐ Reviews: 3 (avg rating: 4.67/5)')
    console.log('💳 Purchases: 3 (total: 1,750 credits)')
    console.log('🔔 Notifications: 5')
    console.log('')
    console.log('💰 Credit Balances:')
    console.log('   Learners:')
    console.log('   • Maria Santos: 500 credits')
    console.log('   • Juan Dela Cruz: 1,000 credits')
    console.log('   • Sofia Reyes: 250 credits')
    console.log('   • Mark Tan: 2,500 credits')
    console.log('   • Claire Lim: 3,000 credits')
    console.log('   • Ryan Kim: 1,800 credits')
    console.log('   • Jessica Wong: 5,000 credits (highest balance for extensive testing)')
    console.log('   ')
    console.log('   Mentors (Credits Earned):')
    console.log('   • Carlos Rodriguez: 320 credits (₱50/hr, 8 years exp)')
    console.log('   • Ana Martinez: 560 credits (₱45/hr, 6 years exp)')
    console.log('   • Miguel Garcia: 125 credits (₱60/hr, 7 years exp)')
    console.log('   • Isabella Cruz: 280 credits (₱40/hr, 5 years exp)')
    console.log('   • David Lopez: 445 credits (₱55/hr, 10 years exp)')
    console.log('')
    console.log('🔗 Portfolio & Professional Links:')
    console.log('   All mentors have:')
    console.log('   • LinkedIn profiles')
    console.log('   • Portfolio websites')
    console.log('   • GitHub/Behance (where applicable)')
    console.log('   • Professional profile pictures')
    console.log('═══════════════════════════════════════════════════════════════════')
    console.log('\n✅ You can now login and test the application!')
    console.log('   Local URL: http://localhost:3000')
    console.log('   Defense URL: https://bridge-mentor.vercel.app (after deployment)\n')

    // Display mentor details for easy reference
    console.log('\n📋 MENTOR PROFILES FOR REFERENCE:')
    console.log('═══════════════════════════════════════════════════════════════════')
    console.log('\n1. Carlos Rodriguez - Full-Stack Developer')
    console.log('   Email: carlos.rodriguez@demo.com')
    console.log('   Skills: React, Node.js, TypeScript, Next.js, PostgreSQL, AWS')
    console.log('   Portfolio: https://carlos-rodriguez.dev')
    console.log('   LinkedIn: https://www.linkedin.com/in/carlos-rodriguez-dev')
    console.log('   GitHub: https://github.com/carlos-rodriguez')
    console.log('\n2. Ana Martinez - UI/UX Designer')
    console.log('   Email: ana.martinez@demo.com')
    console.log('   Skills: Figma, UI/UX, Prototyping, User Research, Design Systems')
    console.log('   Portfolio: https://ana-martinez.design')
    console.log('   LinkedIn: https://www.linkedin.com/in/ana-martinez-design')
    console.log('   Behance: https://www.behance.net/ana-martinez')
    console.log('\n3. Miguel Garcia - Data Scientist & ML Engineer')
    console.log('   Email: miguel.garcia@demo.com')
    console.log('   Skills: Python, Machine Learning, TensorFlow, PyTorch, Deep Learning')
    console.log('   Portfolio: https://miguel-garcia.ai')
    console.log('   LinkedIn: https://www.linkedin.com/in/miguel-garcia-ml')
    console.log('   GitHub: https://github.com/miguel-garcia-ml')
    console.log('\n4. Isabella Cruz - Digital Marketing Strategist')
    console.log('   Email: isabella.cruz@demo.com')
    console.log('   Skills: SEO, Content Marketing, Social Media, Google Ads')
    console.log('   Portfolio: https://isabella-cruz.marketing')
    console.log('   LinkedIn: https://www.linkedin.com/in/isabella-cruz-marketing')
    console.log('\n5. David Lopez - Product Manager & Business Consultant')
    console.log('   Email: david.lopez@demo.com')
    console.log('   Skills: Product Management, Agile, Business Strategy, Leadership')
    console.log('   Portfolio: https://david-lopez.business')
    console.log('   LinkedIn: https://www.linkedin.com/in/david-lopez-pm')
    console.log('═══════════════════════════════════════════════════════════════════\n')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
    throw error
  }
}

main()
  .then(() => {
    console.log('🏁 Seed script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
