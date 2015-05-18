// shim to fix IE8 and earlier being shit
if (!Date.now) {
	Date.now = function() { return new Date().getTime(); }
}

var debugging = false;
var currentSWF = null;
var swfNumber = 0; // the number of the SWF we are currently on (0 if none loaded yet)
var timeoutID;
var currentFilename;
var finished = false;
var ignoreUnpause = false;
var timeLoaded;

function debug()
{
	debugging = true;
	$('#swfDebug').show();
	return "You are now a developer!";
}

function paused()
{
	return $('#pausedcheckbox').prop('checked');
}

function onPauseChange()
{
	// if we changed from paused to unpaused and should load the next swf
	if (!ignoreUnpause && finished && !paused())
	{
		loadNextSwf();
	}
}

function onNextButtonClick()
{
	var currentTime = Date.now();
	
	// the user did not click immediately after a refresh
	if (currentTime - timeLoaded > 500)
	{
		ignoreUnpause = true;
		pausedCheckbox.removeAttr("checked");
		loadNextSwf();
		ignoreUnpause = false;
	}
	
	return false; // cancel normal html link navigation
}

function onObjectLoaded(swf)
{
	var time = parseFloat(swf.attr('time')); // time in seconds 
	if (time > 10)
	{
		timeoutID = setTimeout(loadNextSwf, Math.floor(1000 * parseFloat(time)));
		console.log("Refresh queued in " + time + " seconds");
	}
	else
	{
		timeoutID = setTimeout(loadNextSwf, 60000);
		console.log("Refresh queued in 60 seconds (object loops)");
	}
}

function loadNextSwf(requested)
{
	// clear any running timers
	if (timeoutID) {
		clearTimeout(timeoutID);
		timeoutID = null;
	}
	
	finished = true;
	if (!paused())
	{
		finished = false;
		swfNumber += 1;
		
		/*
		 * You must be wondering why I don't use jQuery callbacks here to
		 * perform an action once the content is loaded. The answer is simple:
		 * the jQuery callback is called before the fucking content is done
		 * fucking loading. I'm not sure if this is a bug or some moron thought
		 * it would be a good idea to have the callback trigger a few hundered
		 * milliseconds before it is useful.
		 */
		
		if (requested)
		{
			// 'requested' should already be urlencoded
			$('#swfSlot').load('/php/randomwillswf.php?swf=' + requested);
		}
		else
		{
			$('#swfSlot').load('/php/randomwillswf.php');
		}
	}
	else
	{
		console.log("waiting for 'paused' checkbox to be unchecked");
	}
}

/*
 * if the user changes the page's hash, load the swf. If the hash is invalid
 * the PHP code will just give us a random file, and we'll change the hash on
 * this end to match.
 */
function ohHashChange()
{
	if (location.hash)
	{
		var newFilename = location.hash.substring(1);
		if (newFilename != currentFilename)
		{
			console.log("hash changed to " + location.hash);
			loadNextSwf(newFilename);
		}
	}
}

// magically called after the current swf is done loading
function queueRefresh(filename)
{
	timeLoaded = Date.now();

	// get the elements we're going to be working with
	var swf = document.randomSWF;
	var isFlash;
	
	if (isFlash = swf.StopPlay)
	{
		swf.StopPlay();
	}
	
	document.cookie = "first=" + "wat";
	document.cookie = "last=" + filename;
	
	var slot = document.getElementById("swfSlot");
	var container = document.getElementById("swfContainer");
	var swf_jquery = $('#randomSWF');
	var progressNode = null; // might never come into being
	
	if (isFlash)
	{	
		// hide the swf
		swf.style.visibility = "hidden";
	}

	// do some debug logging
	var debugText = $('#swfDebug').text();
	if (debugging && debugText) {
		console.log("DEBUG INFO:\n" + debugText);
		$('#swfDebug').show();
	}
	
	currentFilename = filename;
	location.hash = '#' + filename; // might need to be urlencoded
	
	// if we are debugging we already have this and more logged
	if (!debugging)
	{
		console.log("loading " + filename);
	}
	
	if (isFlash)
	{
		// Set up a timer to periodically check value of PercentLoaded
		var loadCheckInterval = setInterval(function (){
			
			// Ensure Flash Player's PercentLoaded method is available and returns a value
			if(typeof swf.PercentLoaded !== "undefined" && swf.PercentLoaded())
			{
				var swfPercent = swf.PercentLoaded();
				if (progressNode)
				{
					progressNode.setAttribute("value", swfPercent);
				}
				// Once value == 100 (fully loaded) we can do whatever we want
				if (currentFilename != filename) // if we're invalid
				{
					clearInterval(loadCheckInterval);
				}
				else if(swfPercent >= 100) // it has probably started playing
				{
					var timeDoneLoading = Date.now();
					
					// Clear timer
					clearInterval(loadCheckInterval);
					
					var endTransition = function()
					{
						if (currentFilename == filename) // if we're still valid
						{
							swf.style.visibility = "initial";
							swf.Play(); // Play the SWF
							if (progressNode)
							{
								container.removeChild(progressNode);
							}
							// Execute function
							onObjectLoaded(swf_jquery);
						}
					}
					
					// if we took a while to load
					if (progressNode && timeDoneLoading - timeLoaded > 1000)
					{
						// fade out the progress bar
						$("#swfProgress").fadeOut(500, endTransition);
					}
					else // we loaded really fast
					{
						// no transition
						endTransition();
					}
				}
				else
				{
					// add the progress bar
					if (!progressNode)
					{
						container.style.position = "relative";
						progressNode = document.createElement("progress");
						progressNode.id = "swfProgress";
						progressNode.setAttribute("value", swfPercent);
						progressNode.setAttribute("max", 100);
						progressNode.style.position = "absolute";
						progressNode.style.left = "50%";
						progressNode.style.top = "50%";
						progressNode.style.transform = "translate(-50%, -50%)";
						container.appendChild(progressNode);
					}
				}
			}
			else
			{
				clearInterval(loadCheckInterval);
			}
		}, 100);
	}
	else
	{
		// not a swf, so skip the loading polling
		console.log("not flash");
		onObjectLoaded(swf_jquery);
	}
}

var pausedCheckbox = $('#pausedcheckbox')
pausedCheckbox.removeAttr("checked");
pausedCheckbox.removeAttr("disabled");
pausedCheckbox.change(onPauseChange);
$('#nextbutton').click(onNextButtonClick);
$(window).on('hashchange', ohHashChange);

// load the initial swf
if (location.hash)
{
	loadNextSwf(location.hash.substring(1));
}
else
{
	loadNextSwf();
}

console.log("For debug info, run debug()");
