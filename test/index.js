/* eslint-env mocha */

const assert = require('assert');
const HelpScout = require('../helpscout.js');

const clientId = 'client-id';
const clientSecret = 'client-secret';

let customerId;
let conversationId;
let mailboxId;

const customer = {
  firstName: 'Testing',
  lastName: 'Help Scout API',
  emails: [{
    type: 'work',
    value: 'testing' + Date.now() + '@gmail.com'
  }]
};

const conversation = {
  subject: 'Subject',
  customer: {
    id: 218297277
  },
  mailboxId: 166129,
  type: 'email',
  status: 'closed',
  createdAt: '2018-10-10T12:00:00Z',
  threads: [{
    type: 'customer',
    customer: {
      id: 218297277
    },
    text: 'Hello, Help Scout. How are you?'
  }]
};

const HelpScoutClient = new HelpScout({
  clientId: clientId, // 'client-id'
  clientSecret: clientSecret // 'client-secret'
});

describe('Authentication', function () {
  it('Client Id and Secret should be specified', function () {
    assert.notEqual(clientId, 'client-id');
    assert.notEqual(clientSecret, 'client-secret');
  });

  it('Should return access token with expiration > now()', async function () {
    const accessToken = await HelpScoutClient.getAccessToken();
    assert(accessToken.expiresAt > Date.now());
  });
});

describe('List', function () {
  it('Can List Mailboxes', async function () {
    const mailboxes = await HelpScoutClient.list('mailboxes');
    mailboxId = mailboxes[0].id;

    assert(mailboxes && Array.isArray(mailboxes) && mailboxes.length > 0, 'No mailboxes found');
  });
});

describe('Create', function () {
  it('Can Create a Customer', async function () {
    customerId = await HelpScoutClient.create('customers', customer);
    assert(customerId);
  });

  it('Can Create a Conversation', async function () {
    conversation.customer.id = customerId;
    conversation.mailboxId = mailboxId;
    conversation.threads[0].customer.id = customerId;
    conversationId = await HelpScoutClient.create('conversations', conversation);
    assert(conversationId);
  });

  it('Can Create a Note in a Conversation with Create', async function () {
    await HelpScoutClient.create('notes', { text: 'Buy more pens' }, 'conversations', conversationId);
    // ensure this runs successfully, nothing returned
  });

  it('Can Create a Note in a Conversation with Helper', async function () {
    await HelpScoutClient.addNoteToConversation(conversationId, 'Test Note');
    // ensure this runs successfully, nothing returned
  });
});

describe('Get', function () {
  it('Get Customer', async function () {
    const foundCustomer = await HelpScoutClient.get('customers', customerId);
    assert(foundCustomer);
  });

  it('Get Conversation', async function () {
    const foundConversation = await HelpScoutClient.get('conversations', conversationId);
    assert(foundConversation);
  });

  it('Get Mailbox', async function () {
    const mailbox = await HelpScoutClient.get('mailboxes', mailboxId);
    assert(mailbox);
  });
});

describe('PUT and PATCH Update', function () {
  it('PUT Update Customer Name', async function () {
    await HelpScoutClient.updatePut('customers', customerId, {
      firstName: 'New Name',
      lastName: 'Testing Help Scout API'
    });

    const foundCustomer = await HelpScoutClient.get('customers', customerId);
    assert.equal(foundCustomer.firstName, 'New Name');
  });

  it('PATCH Update Conversation Subject', async function () {
    await HelpScoutClient.updatePatch('conversations', conversationId, {
      op: 'replace',
      path: '/subject',
      value: 'super cool new subject'
    });

    const foundConversation = await HelpScoutClient.get('conversations', conversationId);
    assert.equal(foundConversation.subject, 'super cool new subject');
  });
});

describe('Delete', function () {
  it('Can Delete a Conversation', async function () {
    await HelpScoutClient.delete('conversations', conversationId);
  });
});
