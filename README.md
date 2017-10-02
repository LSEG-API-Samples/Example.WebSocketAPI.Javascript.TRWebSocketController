
# Elektron WebSocket Controller
Created by Platform Services GitHub tool on Mon Oct 2 2017

## Table of Content

* [Overview](#overview)

* [Disclaimer](#disclaimer)

* [Prerequisites](#prerequisites)

* [Usage](#usage)

* [Interface](#interface)

## <a id="overview"></a>Overview
The Elektron WebSocket Controller is a generic interface used to manage all communication to the Thomson Reuters Elektron WebSocket server delivering realtime market data.  Designed as a reusable container, this simple Javascript framework can be used in a variety of simple web-based applications and prototypes delivering realtime content within your browser.  

For any question related to this component, please use the Developer Community [Q&A Forum](https://community.developers.thomsonreuters.com).

***Note:** To be able to ask questions and to benefit from the full content available on the [TR Developer Community portal](https://developers.thomsonreuters.com) we recommend you to [register here]( https://developers.thomsonreuters.com/iam/register) or [login here]( https://developers.thomsonreuters.com/iam/login?destination_path=Lw%3D%3D).*

## <a id="disclaimer"></a>Disclaimer
The source code presented in this project has been written by Thomson Reuters only for the purpose of illustrating the concepts of interfacing with Thomson Reuters Elektron WebSocket service.  It has not been tested for a usage in production environments.

## <a id="prerequisites"></a>Prerequisites

Software components used:

* [Elektron WebSocket API](https://developers.thomsonreuters.com/elektron/websocket-api-early-access) - Thomson Reuters interface to access Elektron real-time market data.
* Access to the Thomson Reuters Advanced Distribution Server (ADS) version 3 with an enabled WebSocket service. 

## <a id="usage"></a>Usage

Retrieving realtime quotes:

```
// Define our quote controller
var quoteController = new TRWebSocketController();

// Connect into the WebSocket server
quoteController.connect("wsServer:14002", "user");

// Request for streaming quotes from the service 'ELEKTRON_SERVICE'.  Returns 'id' used to eventually close subscription
var id = quoteController.requestData("TRI.N", "ELEKTRON_SERVICE");

// Capture market data quotes
quoteController.onMarketData(function(msg) {
    console.log(msg);
}

```

Retrieving realtime news headlines and stories:

```
// Define our quote controller
var newsController = new TRWebSocketController();

// Connect into the WebSocket server
newsController.connect("wsServer:14002", "user");

// Request for streaming news from the service 'ELEKTRON_SERVICE'.  Returns 'id' used to eventually close subscription
var id = newsController.requestNewsStory("ELEKTRON_SERVICE");

// Capture streaming headlines
newsController.onNewsStory(function(story) {
    console.log(story.headline);
    console.log(story.body);
}

```

Manage status events from our server:

```
...

controller.onStatus(function(eventCode, msg) {
    switch (eventCode) {                    
        case this.status.connected:
            console.log("Connection to WebSocket server successfull");
            break;
                    
        case this.status.disconnected:
            console.log("Connection to server is Down/Unavailable");
            break;
                    
        case this.status.loginResponse:
            console.log("Login status: " + msg);
            break;
                    
        case this.status.msgStatus:
            console.log("Item status response: " + msg);               
            break;
                    
        case this.status.processingError:
            console.log("Controller error: " + msg);
            break;
    }
});
```

## <a id="interface"></a>Interface

* **TRWebSocketController()**

    Constructs a new controller managing all communication to an Elektron WebSocket server endpoint.

* **TRWebSocketController.connect(server, user, appId="256", position="127.0.0.1");**

    Initiate an asynchronous connection to the specified server endpoint.
    * **server**
        
        IP/hostname and port of the Elektron Advanced Data Server (ADS) managing all communication.  Required.  Parameter syntax:
        ``` 
        <IP/hostname>:<port>.  Eg: wsServer:14002
        ```
    * **user / appId / position**

        These 3 parameters are used as authentication to the ADS server.  Refer to the [WebSocket API documentation](https://developers.thomsonreuters.com/elektron/websocket-api-early-access/downloads) for specific details of each parameter.

* **TRWebSocketController.requestData(ric, serviceName, streaming=true, domain="MarketPrice")**

    Request for data from the WebSocket server based on the specified item and service.
    * **ric**
    
        The Reuters Instrument Code (RIC) defining the item of interest.  Required.

    * **serviceName**
    
        The name of the service providing the market data.  Required.

    * **streaming**
    
        Boolean value defining whether the data retrieved is streamed (true) or whether non-streaming snaphost data only (false).  Optional.  Default: true (streaming).

    * **domain**

        The domain model associated with the specified item (ric).  Refer to the documentation for all valid domain models.  Optional.  Default: 'MarketPrice'.

* **TRWebSocketController.requestNewsStory(serviceName)**

    Request to open news stream.
    * **serviceName**

        The name of the service providing the news data.  Required.

* **TRWebSocketController.closeRequest(id)**

    Close the open streaming request as identified by the 'id' token.

    * **id**
    
        Token identifier returned from requesting data (requestData(), requestNewsStory()).

* **TRWebSocketController.closeAllRequests()**

    Close all outstanding streaming requests.

* **TRWebSocketController.loggedIn()**

    Determine if we have successfully connected and logged in to our WebSocket server.  Returns boolean.

* **TRWebSocketController.onStatus(eventFn)**

    Callback to capture status events generated from controller interaction.

    * **eventFn**

        Callback to capture events using the signature: eventFn(eventCode, msg).

        * **eventCode**
        
            Code identifying the event.  Values:

            * **status.connected**
        
                Successfully connected into the Elektron WebSocket server.

            * **status.disconnected**
            
                Connection failed to our Elektron WebSocket server.

            * **status.loginResponse**
        
                After a successfull connection, a login request to the server is submitted.  The login response will provide results of the request within the 'msg' object.

            * **status.msgStatus**
        
                Item response based on request for data.  The 'msg' object will contain status details of the request. 

            * **status.processingError**
        
                Generic controller processing error using resulting from issues with environment/browser etc.  The 'msg' object will contain the details.

        * **msg**
    
            Depending on the event, the 'msg' object will contain the details of the response.

* **TRWebSocketController.onMarketData(eventFn)**

    Callback to capture market data message resulting from requestData() requests.  

    * **eventFn**

        Callback signature: eventFn(msg)

        * **msg**
    
            Refer to the WebSocket API documentation for the data Messages received.

* **TRWebSocketController.onNewsStory(eventFn)**
    
    Callback to capture market data message resulting from requestNewsStory() request.  

    * **eventFn**

        Callback signature: eventFn(msg)

        * **msg**
    
            The complete envelope containing all related fragments for the story.  The msg object is the uncompressed FRAGMENT portion of the news updates.

### <a id="contributing"></a>Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

### <a id="authors"></a>Authors

* **Nick Zincone** - Release 1.0.  *Initial version*

### <a id="license"></a>License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
