# Help Scout Mailbox 2.0 Node.js SDK

## About this Module

This module was built to make using the [Help Scout Mailbox API 2.0](https://developer.helpscout.com/mailbox-api/) endpoints as easy as possible.

It contains wrappers around each type of endpoint (Create, List, Update, etc.) to manage the authentication, callbacks, error handling, pagination, and other stuff you probably don't want to spend a lot of time coding for.

This module supports the Client Credentials Flow authentication method which is suited for apps you can create and manage, ideally suited for internal projects.

*Disclaimer: This module is not in any way affiliated to or supported by Help Scout Inc. It's an open-source act of love to get to the fun part of writing code faster.*


## Installation
```
$ npm install helpscout-2.0
```

## Initialization

**Create an OAuth2 Application**
First things first, [create an OAuth2 Application](https://developer.helpscout.com/mailbox-api/overview/authentication/#oauth2-application) under your profile in Help Scout. We won't be using the OAuth flow so the redirect URL is not needed to use this Module.

**Import the Module and Create a Client**
All API Methods are made available via a Help Scout *Client*. Once you create your OAuth2 application, we'll use the App Id and Secret provided to authenticate your API Calls.

It may look something like this when you're done:

    var HelpScout = require('helpscout-2.0');

    var HelpScoutClient = new HelpScout({
      "clientId": "26d567febd264ec8b7845a4adfXXXXXX",
      "clientSecret": process.env.HELPSCOUT_APP_SECRET
    });

 🎉 Awesome, you now have a client that can use all of the helper methods below.

## Testing
A full test suite is available for your convenience.

**Step 1:** Modify **test/index.js** to provide your Client Id and Secret obtained above.

**Step 2:** Run the tests

    npm test
The output should look something like this:

![all tests passing](https://i.imgur.com/OonVJOE.png)

## Async/Await, Promise, and Callback Support
This library supports both promises and traditional callbacks. By default, all functions return a promise. If you supply a function into the optional callback params, the passed function will be called instead of the promise being resolved.

Examples of using await can be found in the tests above or examples below.

# HTTP Methods
## create();
Create a new Resource.
```
HelpScoutClient.create(type, data, parentType, parentId, error_callback, callback);
```
**type:** Type of Resource to create ("conversations", "customers", ..)

**data:** Object containing the resource data

**parentType:** Optional field to support resources that are created below an existing resource.

**parentId:** Optional field indicating Id the parent resource that this resource should be created under.

**error_callback:** Optional function that is called if an error occurred during creation of the specified resource.

**callback:** Optional function called after successful creation, the id of the object created is passed to this function.

**Example 1: Create a new Customer**
```
var customer = {
  "firstName" : "TestFirst",
  "lastName" : "TestLast",
  "emails" : [{"type": "work", "value": "test1234@gmail.com"}]
};

let customerId = await HelpScoutClient.create('customers', customer);

HelpScoutClient.create('customers', customer, '', '', console.error, console.log);
```

**Example 2: Create a new note in a conversation**
```
await HelpScoutClient.create('notes', { "text" : "Example Conversation"}, "conversations", 712477488);
```
*Note: [No id is passed from Help Scout](https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/note/#response) when creating child objects like notes.*

## list();
Get a list of Resources, this module handles the pagination and rate-limiting for you. If no results are returned, an empty array is returned.
```
HelpScoutClient.list(type, queryParams, parentType, parentId, error_callback, callback);
```
**type:** Type of Resource to list ("conversations", "customers", ..)

**queryParams:** Query String to use - Help Scout supports a ton of super cool, super complex query strings like [this](https://developer.helpscout.com/mailbox-api/endpoints/conversations/list/#query) or [this](https://developer.helpscout.com/mailbox-api/endpoints/customers/list/#query). This parameter expects a string to put after the "?" in the request, do *not* include the "?" mark in the string you pass in.

**parentType:** Optional field to support resources that are created below an existing resource.

**parentId:** Optional field indicating Id the parent resource that this resource should be created under.

**error_callback:** Optional function that is called if an error occurred during retrieval, the error message / JSON will be passed to the function.

**callback:** Optional function that is passed an array of all resources meeting the criteria.

**Example 1: Get all Mailboxes**
```
let mailboxArr = await HelpScoutClient.list('mailboxes');
```
**Example 2: Get all Customers**
```
HelpScoutClient.list('customers',null,'','',console.error, function(customers) {
  console.log("there are " + customers.length + " customers currently.");
});
```


## get();
Get a specific resource based on an id
```
HelpScoutClient.get(type, resourceId, embeddables, subType, error_callback, callback);
```
**type:** Type of Resource to get ("conversations", "customers", ..)

**resourceId:** Id of the resource you'd like to retrieve.

**embeddables:** On certain endpoints like Customers, [Help Scout requires you explicitly ask for any lists of related resources](https://developer.helpscout.com/mailbox-api/endpoints/customers/get/#url-parameters). Pass in an array of related resource labels (as strings) to have those included in the object that comes back, see Example 1 below.

**subType:** Optional field for certain endpoints to return an **array** of Resources below the Resource you're getting, see Example 2 below.

**error_callback:** Optional function that is called if an error occurred during retrieval, the error message / JSON will be passed to the function.

**callback:** Optional function this is passed the resource requested to this function as an Object.

**Example 1: Get Customers with Emails and Social Profiles**
```
HelpScoutClient.get('customers', 218297277, ['emails', 'social_profiles'], '', console.error, console.log);
```
**Example 2: Get Folders in a Mailbox**
```
let folderArr = await HelpScoutClient.get('mailboxes', 166129, '', 'folders');
```
## updatePut();
For certain Help Scout Endpoints, you'll want to use the "PUT" method when updating a Resource. The PUT method replaces all of the Resource's properties with the data you specify.
```
HelpScoutClient.updatePut(type, resourceId, data, parentType, parentId, error_callback, callback);
```
**type:** Type of Resource to update ("conversations", "customers", ..)

**resourceId:** Optional, Id of the resource you'd like to update. (i.e. Email Address for Customer)

**data:** Object containing the resource data that will replace the current data

**parentType:** Optional field to support resources that are updated below an existing resource.

**parentId:** Optional field indicating Id the parent resource that this resource should be updated under.

**error_callback:** Optional function that is called if an error occurred during update, the error message / JSON will be passed to the function.

**callback:** Optional function called after successful update of a resource, Help Scout returns no data to pass to your function.

**Example 1: Update Email Address for a Customer**
```
  await HelpScoutClient.updatePut("emails",292627333, {
    "type" : "work",
    "value" : "test4@gmail.com"
  }, "customers", 218297277);
```
## updatePatch();
For certain Help Scout Endpoints, you'll want to use the "PATCH" method when updating a Resource. The PATCH method updates specific Resource properties while leaving other properties untouched. I highly recommend reviewing [HelpScout's documentation of patching](https://developer.helpscout.com/mailbox-api/endpoints/conversations/update/).
```
HelpScoutClient.updatePut(type, resourceId, data, parentType, parentId, error_callback, callback);
```
**type:** Type of Resource to update ("conversations", "customers", ..)

**resourceId:** Id of the resource you'd like to update.

**data:** Object containing the resource data that will replace the current data

**parentType:** Optional field to support resources that are updated below an existing resource.

**parentId:** Optional field indicating Id the parent resource that this resource should be updated under.

**error_callback:** Optional function that is called if an error occurred during update, the error message / JSON will be passed to the function.

**callback:** Optional function called after successful update of a resource, Help Scout returns no data to pass to your function.

**Example 1: Update Conversation Subject Line**
```
  await HelpScoutClient.updatePatch("conversations",712477488, {
    "op" : "replace",
    "path" : "/subject",
    "value" : "Super cool new subject"
  }, '', '');
```
# Business Helpers
Something I'd like to do more of with this module is further abstract basic use-cases to make them incredibly easy and clean to perform.

For example, adding a note to a conversation. I feel it's a better experience to support something like:
```
await HelpScoutClient.addNoteToConversation(convoId, "Test Note");
```
as opposed to
```
await HelpScoutClient.create('notes', { "text" : "Test Note"}, "conversations", convoId);
```
The issue that makes this challenging to execute is what business logic gets implemented vs. which do we leave up to the developer.

To be figured out, but for now, "addNoteToConversation" is actually a real method the module supports in the above way, and mostly serves as an example of what could be.

# Public Base Methods

## getAccessToken();
Note: This should never need to be called by your code directly, but it's provided if you ever need to get or log the access token for testing or debugging.
```
HelpScoutClient.getAccessToken(error_callback, callback);
```
**error_callback:** Optional function that is called if an error occurred during authentication, the error message / JSON will be passed to the function.

**callback:** Optional function called after successful retrieval or creation of a valid access token, the access token object is passed to this function.

The Access Token object has the following properties:
```
{
	token_type: 'bearer',
	access_token: '0bd7a97cfbe24f99b65b4ba7d35b7c74',
	expiresAt: 1542715477601
}
```
"expiresAt" is the Epoch expiration time calculated to make comparing to Date.now(); super easy.

## rawApi();

If you want to leverage the authentication that comes with the client, but need to query something super specific or not covered by this Module, this method is for you. It'll submit the request and make the callbacks on your behalf.
```
HelpScoutClient.rawApi(method, url, data, error_callback, callback);
```
**method:** HTTP Method (GET, POST, DELETE, etc.)

**url:** Full URL, including everything from https:// to the query string.

**data:** For POST requests, specify the data we should post to the URL

**error_callback:** Optional function that is called if an error occurred while making the API request, the error message / JSON will be passed to the function.

**callback:** Optional function called after successful request. Note that the entire response object is passed to the function, so it may be helpful to pull out the body or status code parameters depending on the function used.

## Help Wanted
This was put together as a project to help developers get developing quickly on the HelpScout platform.

I would love to have this become a widely adopted open source library for all Help Scout customers and partners. If you have an idea about how to extend this, want to contribute, or notice any issues, please file an Issue on GitHub or get in touch with me, shaun.t.vanweelden[at]gmail.com.

## License
This module is provided as an open-source project under the MIT License, it is not in any way supported or affiliated with Help Scout Inc.
