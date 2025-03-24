# GCBC Teleprompter

This is used to dynamically load show script from Google Doc and show it in dark mode as a teleprompter.
It also contains some tools to dynamically substitute texts, change fonts and colors, and synchronize scroll position across multiple instances to do remote scrolling.

Sample usage:

http://localhost:3000/?src=${docId1}&sub=${docId2}&provider=gdrive

For Google Docs, `src` should be a Google Doc. It'll be downloaded as an HTML, so styles will be preserved along with other modifications. `sub` needs to be a JSON file with an array of key/value pairs for custom substitutions. 
