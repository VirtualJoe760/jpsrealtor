import { NextResponse } from 'next/server';
import {
  getTrelloBoardLists,
  createTrelloCard,
  createDeploymentCard,
  createBugCard,
  createFeatureCard,
} from '@/lib/trello';

/**
 * POST /api/trello/test
 * Create test cards in the Trello board
 */
export async function POST() {
  try {
    // First, get all lists to find the Developer Tasks list
    const lists = await getTrelloBoardLists();
    console.log('Available lists:', lists);

    // Find the Developer Tasks list (or use the first list as fallback)
    const devTasksList = lists.find((list: any) =>
      list.name.toLowerCase().includes('developer') ||
      list.name.toLowerCase().includes('tasks') ||
      list.name.toLowerCase().includes('to do')
    ) || lists[0];

    if (!devTasksList) {
      return NextResponse.json(
        { error: 'No lists found on the board' },
        { status: 404 }
      );
    }

    console.log(`Creating test cards in list: ${devTasksList.name} (${devTasksList.id})`);

    // Create test cards
    const cards = [];

    // Test Card 1: Simple task
    const card1 = await createTrelloCard({
      name: '🧪 Test Card: Trello Integration Working',
      desc: `This is a test card created via the Trello API.\n\n**Created:** ${new Date().toLocaleString()}\n**Purpose:** Verify API integration is working correctly`,
      idList: devTasksList.id,
      pos: 'top',
    });
    cards.push(card1);
    console.log('Created card 1:', card1.name);

    // Test Card 2: Deployment card
    const card2 = await createDeploymentCard(
      'development',
      'v1.0.0-test',
      devTasksList.id
    );
    cards.push(card2);
    console.log('Created card 2:', card2.name);

    // Test Card 3: Bug report
    const card3 = await createBugCard(
      'Sample Bug Report',
      'This is an example of how bug reports will appear in Trello. Includes priority level and timestamp.',
      devTasksList.id,
      'medium'
    );
    cards.push(card3);
    console.log('Created card 3:', card3.name);

    // Test Card 4: Feature request
    const card4 = await createFeatureCard(
      'Enhanced DevOps Tracking',
      'Automatically create Trello cards for:\n- Build failures\n- Deployment completions\n- New feature implementations\n- Bug discoveries\n\nThis will help track all development activities in one centralized board.',
      devTasksList.id
    );
    cards.push(card4);
    console.log('Created card 4:', card4.name);

    return NextResponse.json({
      success: true,
      message: `Created ${cards.length} test cards in "${devTasksList.name}" list`,
      listUsed: {
        id: devTasksList.id,
        name: devTasksList.name,
      },
      cards: cards.map(card => ({
        id: card.id,
        name: card.name,
        url: card.url,
      })),
    });

  } catch (error: any) {
    console.error('Trello test error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create test cards',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trello/test
 * Get information about the board and lists
 */
export async function GET() {
  try {
    const lists = await getTrelloBoardLists();

    return NextResponse.json({
      success: true,
      boardId: process.env.TRELLO_BOARD_ID,
      lists: lists.map((list: any) => ({
        id: list.id,
        name: list.name,
        closed: list.closed,
      })),
    });

  } catch (error: any) {
    console.error('Trello GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get board information',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
