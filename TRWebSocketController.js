//****************************************************************************************************************************************** 
// TRWebSocketController
//
// The TRWebSocketController is a generic interface supporting the ability to connect and receive real-time market data quotes from the
// Thomson Reuters Elektron WebSocket interface.  The controller is intentionally designed as a generic interface allowing appplication
// usage to work with any Javascript framework.
//
// Interface:
//
//      TRWebSocketController()
//      TRWebSocketController.connect(server, user, appId="256", position="127.0.0.1");
//      TRWebSocketController.requestData(ric, serviceName, streaming=true, domain="MarketPrice");
//      TRWebSocketController.requestNewsStory(serviceName);
//      TRWebSocketController.closeRequest(id)
//      TRWebSocketController.closeAllRequests()
//      TRWebSocketController.loggedIn()
//      TRWebSocketController.onStatus(eventFn)
//      TRWebSocketController.onMarketData(eventFn)
//      TRWebSocketController.onNewsStory(eventFn)
//
// Status Events:
//      TRWebSocketController.status
//
// Author:  Nick Zincone
// Version: 1.0
// Date:    September 2017.
//****************************************************************************************************************************************** 


const NEWS_STORY = "NewsTextAnalytics";

//
// TRWebSocketController()
// Quote controller instance managing connection, login and message interaction to a TR Elektron WebSocket service.
//
function TRWebSocketController() {  
    this._loggedIn = false;
    this._statusCb = null;
    this._marketDataCb = null;
    this._newsStoryCb = null;
    this._msgCb = null;
    this._loginParams = {
        user: "",
        appID: "",
        position: ""
    };
    
    // Manage our Request ID's required by the Elektron WebSocket interface
    var  _requestIDs = [];
    
    // Retrieve the next available ID from our ID table
    this._getID = function() {
        for (var i in _requestIDs) {
            if (!_requestIDs[i].used) {
                _requestIDs[i].used = true;
                _requestIDs[i].processingCb = null;
                return(parseInt(i));
            }
        }
     
        // Create a new entry
        _requestIDs[_requestIDs.length] = {
            used: true,
            processingCb: null
        }

        return(_requestIDs.length-1);
    }

    // Flag the request ID to be removed (available)
    this._removeID = function(id) {
        if ( _requestIDs[id].used ) {
            _requestIDs[id].used  = false;
            return(true);
        }
        return(false);
    }
    
    // Get first ID with an open stream.  Note: ignores first entry - our login stream.
    this._getAvailableStreams = function() {
        var result = [];
        for (var i in _requestIDs)
            if ( _requestIDs[i] && parseInt(i)>0 ) result[result.length] = i;
        
        return(result);
    }
    
    // Define specific callback for requested msg
    this._setCallback = function(id, cb) {
        if ( _requestIDs[id] )
            _requestIDs[id].processingCb = cb;
    }
    
    // Retrieve specific processing callback based on id.
    this._getCallback = function(id) {
        if ( _requestIDs[id] )
            return( _requestIDs[id].processingCb );
    }

    // Manage our News Envelope
    var _newsEnvelope = {};
    
    this._getNewsEnvelope = function(guid) {
        return(_newsEnvelope[guid]);
    }
    
    this._setNewsEnvelope = function(guid, envelope) {
        _newsEnvelope[guid] = envelope;
    }
    
    this._deleteNewsEnvelope = function(guid) {
        delete _newsEnvelope[guid];
    }
}

//
// Status events
TRWebSocketController.prototype.status = {
    processingError: 0,
    connected: 1,
    disconnected: 2,
    loginResponse: 3,
    msgStatus: 4
};

//
// TRWebSocketController.connect(server, user, appId="256", position="127.0.0.1")
// Initiate an asynchronous connection request to the specified server.  Upon successful connection, issue a login to our server
// using the supplied user/appId/position login parameters.
//
// Parameters:
//      server      Address of the Elektron WebSocket server.  Format: hostname:port.  Required.
//      user        DACs user ID.  Required.
//      appId       DACs application ID.  Optional.  Default: '256'.
//      position    DACs position.  Optional.  Default: '127.0.0.1'.
//
TRWebSocketController.prototype.connect = function(server, user, appId="256", position="127.0.0.1") { 
    // Connect into our WebSocket server
    this.ws = new WebSocket("ws://" + server + "/WebSocket", "tr_json2");
    this.ws.onopen = this._onOpen.bind(this);
    this.ws.onmessage = this._onMessage.bind(this);
    this.ws.onclose = this._onClose.bind(this);
    this._loginParams.user = user;
    this._loginParams.appId = appId;
    this._loginParams.position = position;
}

//
// TRWebSocketController.requestData(ric, serviceName, streaming=true, domain="MarketPrice")
// Request the market data from our WebSocket server.
//
// Parameters:
//      ric          Reuters Instrument Code defining the market data item.  Eg: AAPL.O 
//      serviceName  Name of service where market data is collected
//      streaming    Streaming-based (subscription) or Non-streaming (snapshot).  Default: streaming.
//      domain       Domain model for request.  Default: MarketPrice.
//
// Returns: ID of request.  This ID is used to close streaming requests only.  Closing a non-streaming request has no effect.
// 
TRWebSocketController.prototype.requestData = function(ric, serviceName, streaming=true, domain="MarketPrice")
{
    if ( !this._loggedIn )
        return(0);
    
    // Rolling ID
    var id = this._getID();
    this._setCallback(id, this._marketDataCb);
    
    // send marketPrice request message
    var marketPrice = {
        Id: id,
        Streaming: streaming,
        Domain: domain,
        Key: {
            Name: ric,
            Service: serviceName
        }
    };

    // Submit to server
    this._send(JSON.stringify(marketPrice)); 

    return(id);
};

//
// TRWebSocketController.requestNewsStory(serviceName)
// Request the MRN_STORY news story from our WebSocket server.
//
// Parameters:
//      serviceName  Name of service where market data is collected
//
// Returns: ID of request.  This ID is used to close the news story.
// 
TRWebSocketController.prototype.requestNewsStory = function(serviceName)
{
    var id = this.requestData("MRN_STORY", serviceName, true, NEWS_STORY);
    this._setCallback(id, this._processNewsEnvelope);
    this._processNewsEnvelope({});
    
    return(id);
};

// TRWebSocketController.closeRequest(id)
//
// Close the open stream based on the 'id' returned when you requested the streaming data.
//   
TRWebSocketController.prototype.closeRequest = function(id) 
{
    // Close request message
    var close = {
        Id: id,
        Type: "Close"
    };

    // Submit to server
    this._send(JSON.stringify(close));
    
    // Cleanup our ID table
    this._removeID(id);
};

// TRWebSocketController.closeAllRequests
//
// Close all outstanding streaming requests.
//   
TRWebSocketController.prototype.closeAllRequests = function() 
{
    // Retrieve all open streams
    var openStreams = this._getAvailableStreams();
    
    // For each one, close
    for (var i in openStreams)
        this.closeRequest(parseInt(openStreams[i]));
};

//
// onStatus
// Capture all status events related to connections, logins and general message status.  
//
// Parameters:
//      status {
//          statusCode: code,
//          statusMsg:  msg   
//      }
//
//      where code/msg is:
//          0 - processingError
//              msg contains text of error.
//          1 - connected
//              msg not defined.
//          2 - disconnected
//              msg not defined.
//          3 - login response
//              msg contains Elektron login response - see Elektron WebSocket API for details.
//          4 - msg status
//              msg contains Elektron status message - see Elektron WebSocket API for details.
TRWebSocketController.prototype.onStatus = function(f) {
    if ( this.isCallback(f) ) this._statusCb = f;
}

//
// onMarketData
// Presents the market data refresh/update messages.  
//
// Parameters:
//      msg - Elektron WebSocket market data message.  Refer to the Elektron WebSocket API documentation for details.
//
TRWebSocketController.prototype.onMarketData = function(f) {
    if ( this.isCallback(f) ) this._marketDataCb = f;
}

//
// onNewsStory
// Presents the news story to our callback.
//
// Parameters:
//      msg - Elektron WebSocket news headline and story.
//
TRWebSocketController.prototype.onNewsStory = function(f) {
    if ( this.isCallback(f) ) this._newsStoryCb = f;
}

//
// loggedIn
// Returns true if we are successfully logged into the Elektron WebSocket server.
//
TRWebSocketController.prototype.loggedIn = function() {
    return(this._loggedIn);
}






//*********************************************************************************************************     
// _onOpen (WebSocket interface)
// We arrive here upon a valid connection to our Elektron WebSocket server.  Upon a valid connection,
// we issue a request to login to the server.
//*********************************************************************************************************   
TRWebSocketController.prototype._onOpen = function() {
    // Report to our application interface
    if ( this.isCallback(this._statusCb) ) this._statusCb(this.status.connected);

    // Login to our WebSocket server
    this._login();
};

//*********************************************************************************************************  
// _onClose (WebSocket interface)
// In the event we could not initially connect or if our endpoint disconnected our connection, the event
// is captured here.  We simply report and make note.
//*********************************************************************************************************
TRWebSocketController.prototype._onClose = function (closeEvent) {
    this._loggedIn = false; 
    
    // Report to our application interface
    if ( this.isCallback(this._statusCb) ) this._statusCb(this.status.disconnected);
};

//*********************************************************************************************************      
// _onMessage (WebSocket interface)
// All messages received from our TR WebSocket server after we have successfully connected are processed 
// here.
// 
// Messages received:
//
//  Login response: Resulting from our request to login.
//  Ping request:   The WebSocket Server will periodically send a 'ping' - we respond with a 'pong'
//  Data message:   Refresh and update market data messages resulting from our item request
//*********************************************************************************************************  
TRWebSocketController.prototype._onMessage = function (msg) 
{
    // Ensure we have a valid message
    if (typeof (msg.data) === 'string' && msg.data.length > 0)
    {
        try {
            // Parse the contents into a JSON structure for easy access
            var result = JSON.parse(msg.data);

            // Our messages are packed within arrays - iterate
            var size = result.length;
            var msg = {}
            for (var i=0; i < size; i++) {
                msg = result[i];
                
                // Did we encounter a PING?
                if ( msg.Type === "Ping" ) {
                    // Yes, so send a Pong to keep the channel alive
                    this._pong();
                } else if ( msg.Domain === "Login" ) { // Did we get our login response?
                    // Yes, process it. Report to our application interface
                    this._loggedIn = msg.State.Data === "Ok";
                    if ( this.isCallback(this._statusCb) ) this._statusCb(this.status.loginResponse, msg);
                } else if ( msg.Type === "Status" ) {
                    // Issue on our message stream.  Make our ID available is stream is closed.
                    if ( msg.State.Stream == "Closed") this._removeID(msg.Id);
                    
                    // Report potential issues with our requested market data item
                    if ( this.isCallback(this._statusCb) ) this._statusCb(this.status.msgStatus, msg);                        
                }
               else {
                    // Otherwise, we must have received some kind of market data message.
                    
                    // First, retrieve the processing callback
                    this._msgCb = this._getCallback(msg.Id);
                    
                    // Next, update our ID table based on the refresh
                    if ( msg.Type === "Refresh" && msg.State.Stream === "NonStreaming" ) this._removeID(msg.Id);
                    
                    // Process the message
                    if ( this.isCallback(this._msgCb) ) this._msgCb(msg);
               }
            }
        }
        catch (e) {
            // Processing error.  Report to our application interface
            if ( this.isCallback(this._statusCb) ) this._statusCb(this.status.processingError, e.message);
        }       
    }
}

//********************************************************************************************************* 
// _processNewsEnvelope
// We received an MRN news story message which is an envelop around the specific details of the headline
// and news story.  Preprocess this envelop prior to sending off to the news story application callback.
//
// Note: this routine is only executed if application requested for news story using the convenient method
//       call: requestNewsStory().
//********************************************************************************************************* 
TRWebSocketController.prototype._processNewsEnvelope = function(msg)
{
    // We ignore the MRN Refresh envelope and ensure we're dealing with a 'NewsTextAnalytics' domain.    
    if ( msg.Type === "Update" && msg.Domain === NEWS_STORY ) {
        //********************************************************************************
        // Before we start processing our fragment, we must ensure we have all of them.
        // The GUID field is used to identify our envelope containing each fragment. We
        // know we have all fragments when the total size of the fragment == TOT_SIZE.
        //********************************************************************************
  
        // Decode base64 (convert ascii to binary)  
        var fragment = atob(msg.Fields.FRAGMENT);
        
        if ( msg.Fields.FRAG_NUM > 1 ) {
            // We are now processing more than one part of an envelope - retrieve the current details
            var envelope = this._getNewsEnvelope(msg.Fields.GUID);
            if ( envelope ) {
                envelope.fragments = envelope.fragments + fragment;
                
                // Check to make sure we have everything.
                if ( envelope.fragments.length < envelope.totalSize)
                    return;  // No - wait for some more

                // Yes - process 
                fragment = envelope.fragments;
  
                // Remove our envelope 
                this._deleteNewsEnvelope(msg.Fields.GUID);
            }
        } else if ( fragment.length < msg.Fields.TOT_SIZE) {
            // We don't have all fragments yet - save what we have
            this._setNewsEnvelope(msg.Fields.GUID, {fragments: fragment, totalSize: msg.Fields.TOT_SIZE});
            return;
        }

        // *********************************************************
        // All fragments have been received for this story - process
        // *********************************************************
        
        // Convert binary string to character-number array
        var charArr = fragment.split('').map(function(x){return x.charCodeAt(0);});
        
        // Turn number array into byte-array
        var binArr = new Uint8Array(charArr);

        // Decompress fragments of data
        var data = zlib.pako.inflate(binArr);

        // Convert gunzipped byteArray back to ascii string:
        var strData = String.fromCharCode.apply(null, new Uint16Array(data));
        var contents = JSON.parse(strData);
        
        // Present our final story to the application
        if ( this.isCallback(this._newsStoryCb) ) this._newsStoryCb(contents);
    }
}

//********************************************************************************************************* 
// _login
// Once we connect into our Elektron WebSocket server, issue a login request as: 
//
// Eg JSON request format:
// {
//     "Domain": "Login",
//     "Id": 1,
//     "Key": {
//        "Name": "user",
//        "Elements": {
//           "ApplicationId": "256",
//           "Position": "127.0.0.1"
//     }
// }
//
// The supplied 'login' parameter contains our login configuration details.
//********************************************************************************************************* 
TRWebSocketController.prototype._login = function () 
{
    // send login request message
    var login = {
        Id: this._getID(),
        Domain:	"Login",
        Key: {
            Name: this._loginParams.user,
            Elements:	{
                ApplicationId: this._loginParams.appId,
                Position: this._loginParams.position
            }
        }
    };

    // Submit to server
    this._send(JSON.stringify(login));
};

//*******************************************************************************
// _pong
// To keep the Elektron WebSocket connection active, we must periodically send a
// notification to the server.  The WebSocket server sends a 'Ping' message and 
// once received, our application acknowldges and sends a 'Pong'. 
//
// JSON request format:
// {
//     "Type": "Pong"
// }
//
//**************************************************************
TRWebSocketController.prototype._pong = function () 
{
    // Send Pong response
    var pong = {
        Type: "Pong"
    };

    // Submit to server
    this._send(JSON.stringify(pong));
};      

//********************************************************************************************************* 
// _send
// Send a packet of data down our connected WebSocket channel.
//*********************************************************************************************************    
TRWebSocketController.prototype._send = function (text) 
{
    if (this.ws)
        this.ws.send(text);
};

TRWebSocketController.prototype.isCallback = function(methodName) { 
    return( (typeof methodName) == "function" ); 
}
