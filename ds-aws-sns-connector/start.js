var AWS = require('aws-sdk');
var http = require( 'http' );
var deepstreamClient = require( 'deepstream.io-client-js' );
var ds = deepstreamClient( 'localhost:6021' ).login( {}, createHttpServer );

AWS.config.update({
    "secretAccessKey": "...",
    "sessionToken": "...",
    "accessKeyId": "...",
    "region": "eu-central-1"
});

var sns = new AWS.SNS();

function onAwsResponse( error, data ) {
	console.log( error || data );
}

function subscribeToSnS() {
	var params = {
	  Protocol: 'http', /* required */
	  TopicArn: '...', /* required */
	  Endpoint: '...'
	};
	sns.subscribe(params, onAwsResponse );	
}

function parseJSON( input ) {
	try{
		return JSON.parse( input );
	} catch( e ) {
		return input;
	}
}

function handleIncomingMessage( msgType, msgData ) {
	if( msgType === 'SubscriptionConfirmation') {
		sns.confirmSubscription({
			Token: msgData.Token,
			TopicArn: msgData.TopicArn
		}, onAwsResponse );
	} else if( msgType === 'Notification' ) {
		console.log( msgData.Subject, parseJSON( msgData.Message ) );
		ds.event.publish( msgData.Subject, parseJSON( msgData.Message ) );
	} else {
		console.log( 'Unexpected message type ' + msgType );
	}
}

function createHttpServer() {
	var server = new http.Server();

	server.on( 'request', function( request, response ){
		var msgBody = '';

		request.setEncoding( 'utf8' );

		request.on( 'data', function( data ){ 
			msgBody += data;
		});

		request.on( 'end', function(){
			var msgData = parseJSON( msgBody );
			var msgType = request.headers[ 'x-amz-sns-message-type' ];
			handleIncomingMessage( msgType, msgData );
		});

		response.end( 'OK' );
	});

	server.listen( 6001, subscribeToSnS );
}

