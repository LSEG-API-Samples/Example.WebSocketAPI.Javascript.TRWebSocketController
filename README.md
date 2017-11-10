
# Elektron WebSocket Controller
Created by Platform Services GitHub tool on Mon Oct 2 2017

## Table of Content

* [Overview](#overview)

* [Disclaimer](#disclaimer)

* [Package](#package)

* [Usage](#usage)

* [Interface](#interface)

## <a id="overview"></a>Overview
The Elektron WebSocket Controller is a Javascript interface used to manage all communication to the Thomson Reuters Elektron WebSocket server delivering realtime market data to the browser.  Designed as a reusable container, this simple Javascript framework can be used in a variety of simple web-based applications and prototypes delivering realtime content within your browser.  

For any question related to this component, please use the Developer Community [Q&A Forum](https://community.developers.thomsonreuters.com).

***Note:** To be able to ask questions and to benefit from the full content available on the [TR Developer Community portal](https://developers.thomsonreuters.com) we recommend you to [register here]( https://developers.thomsonreuters.com/iam/register) or [login here]( https://developers.thomsonreuters.com/iam/login?destination_path=Lw%3D%3D).*

## <a id="disclaimer"></a>Disclaimer
The source code presented in this project has been written by Thomson Reuters only for the purpose of illustrating the concepts of interfacing with Thomson Reuters Elektron WebSocket service.  It has not been tested for a usage in production environments.

## <a id="package"></a>Package

Software components used:

* [Elektron WebSocket API](https://developers.thomsonreuters.com/elektron/websocket-api-early-access) - Thomson Reuters interface to access Elektron real-time market data. 

* [Pako](https://www.npmjs.com/package/pako) (v1.0.6) - Nodejs-based ibrary used to decompress Elektron Machine Readable News (MRN) headlines and stories.  Applications utilizing the news capabilities offered within this interface must include the 'zlib.js' script within their HTML.

    **Note**: The 'zlib.js' file was prepared by [browserfying](http://browserify.org/) the pako library.  This is a process to bring the capabilities of the node.js library to the browser.  For convenience and interest, I've included the node.js-based file called 'pako.js' which I used to create the 'zlib.js' package.  Refer to 'pako.js' file for general instructions as to how I did this.

* Access to the Thomson Reuters Advanced Distribution Server (ADS) version 3 with an enabled WebSocket service.

## <a id="usage"></a>Usage

The package contains a few examples demonstrating basic usage.

Retrieving realtime quotes:

```
// Define our quote controller
let quoteController = new TRWebSocketController();

// Connect into the WebSocket server
quoteController.connect("wsServer:14002", "user");

// Request for streaming quotes from the service 'ELEKTRON_SERVICE'.
quoteController.requestData("TRI.N", {Service: "ELEKTRON_SERVICE"});

// Capture market data quotes
quoteController.onMarketData(function(msg) {
    console.log(msg);
}

```

Retrieving realtime news headlines and stories:

```
// Define our quote controller
let newsController = new TRWebSocketController();

// Connect into the WebSocket server
newsController.connect("wsServer:14002", "user");

// Request for news content from the service 'ELEKTRON_SERVICE'.  Defaults to streaming headlines and stories (MRN_STORY domain).  
newsController.requestNews("MRN_STORY", "ELEKTRON_SERVICE");

// Capture streaming news content
newsController.onNews(function(ric, story) {
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
        
        IP/hostname and port of the Elektron Advanced Data Server (ADS) managing all communication. **Required**.
        Parameter syntax:
        ``` 
        <IP/hostname>:<port>.  Eg: wsServer:14002
        ```
    * **user / appId / position**

        These 3 parameters are used as authentication to the ADS server.  Refer to the [WebSocket API documentation](https://developers.thomsonreuters.com/elektron/websocket-api-early-access/downloads) for specific details of each parameter.

* **TRWebSocketController.requestData(ric, options={})**

    Request for data from the WebSocket server based on the specified item.

    * **ric**
    
        String or array of names identifying the Reuters Instrument Code(s) - ric(s). **Required**.  
        
        Eg: 'TRI.N'                 (Single)  
        Eg: ['TRI.N', 'AAPL.O']     (Batch)

    * **options**

        Collection of properties defining the different options for the request.  **Optional**.
```
       Options 
       {
           Service: <String>     // Name of service providing data. 
                                 // Default: service defaulted within ADS.
           Streaming: <Boolean>  // Boolean defining streaming (subscription) or Non-streaming (snapshot).  
                                 // Default: true (streaming).
           Domain: <String>      // Domain model for request.  
                                 // Default: MarketPrice.
           View: <Array>         // Fields to retrieve.  Eg: ["BID", "ASK"]
                                 // Default: All fields.
       }
```    

* <a id="news"></a>**TRWebSocketController.requestNews(ric, serviceName=null)**

    Request to open the news stream on the NTA (NewsTextAnalytics) domain.  By executing this method, the TRWebSocketController will automatically manage the collection and decompressing of all compressed segments coming from the NTA domain.  Once the complete contents arrives from the service, the contents of the NTA envelope will be presented as a JSON object to the [onNews()](#newsCb) callback.

	* **ric**
    
		String or array of names identifying the Reuters Instrument Code(s) - ric(s) used to represent the news content set of interest. **Required**.

		Valid news RICs are:

			MRN_STORY:    Real-time News (headlines and stories)
			MRN_TRNA:     News Analytics: Company and C&E assets
			MRN_TRNA_DOC: News Analytics: Macroeconomic News and Events
			MRN_TRSI:     News Sentiment Indices

    * **serviceName**

        The name of the service providing the news data.  **Optional**. Default: service defaulted within ADS.

* **TRWebSocketController.closeRequest(ric, domain="MarketPrice")**

    Close the open streaming requests as identified by the ric(s). **Required**.

    * **ric**
    
        String or array of names identifying the open streams. **Required**.

    * **domain**

        The domain model associated with the specified items (ric).  Refer to the documentation for all valid domain models. **Optional**.  Default: 'MarketPrice'.

* **TRWebSocketController.closeAllRequests()**

    Close all outstanding streaming requests.

* **TRWebSocketController.loggedIn()**

    Determine if we have successfully connected and logged in to our WebSocket server.  
    Returns boolean.

* **TRWebSocketController.onStatus(eventFn)**

    Callback to capture status events generated from controller interaction.

    * **eventFn**

        Callback to capture events using the signature: eventFn(eventCode, msg).

        * **eventCode**
        
            Code identifying the event.  Values:

            * **status.connected**
        
                Successfully connected into the Elektron WebSocket server.  
                The 'msg' object is not defined.

            * **status.disconnected**
            
                Connection failed to our Elektron WebSocket server.  
                The 'msg' object is not defined.

            * **status.loginResponse**
        
                After a successfull connection, a login request to the server is submitted.  The login response will provide results of the request within the 'msg' object.
                The 'msg' object contains the Elektron WebSocket loging response.  See the WebSocket API documentation for details.

            * **status.msgStatus**
        
                Item response based on request for data.  
                The 'msg' object contains the Elektron WebSocket status message.  See the WebSocket API documentation for details. 

            * **status.processingError**
        
                Generic controller processing error using resulting from issues with environment/browser etc.  
                The 'msg' object the error text.

        * **msg**
    
            Depending on the event, the 'msg' object will contain the details of the response.

* **TRWebSocketController.onMarketData(eventFn)**

    Callback to capture market data message resulting from requestData() requests.  

    * **eventFn**

        Callback signature: eventFn(msg)

        * **msg**
    
            Refer to the WebSocket API documentation for the data Messages received.

## <a id="newsCb"></a>
* **TRWebSocketController.onNews(eventFn)**
    
    Callback to capture news events resulting from requestNews() request.

    * **eventFn**

        Callback signature: eventFn(ric, msg)

		* **ric**
        
			RIC name of the News content set.  See [requestNews()](#news) for details of valid News RICs.

        * **msg**
    
            The contents of the NTA envelope containing all related fragments for the news events.  The msg object is the uncompressed FRAGMENT portion of the news updates.

### <a id="contributing"></a>Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

### <a id="authors"></a>Authors

* **Nick Zincone** - Release 1.0.  *Initial version*

### <a id="license"></a>License

This project and the Pako library are licensed under the [MIT License](https://opensource.org/licenses/MIT) - see the [LICENSE.md](LICENSE.md) file for details.
