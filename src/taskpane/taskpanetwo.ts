/*
 * Copyright (c) 2020 Vlaamse Overheid. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

import get = Reflect.get;

/** The config for this code */
namespace AppConfig {
  /** The URL of the Oslo data file. Retrieved with a simple GET. This static resource is replaced with a dynamic backend endpoint in the production environment. */
  export const dataFileUrl = "/oslo_terminology.json";

  //export const englishLocale = "/en.json";
  export const dutchLocale = "/nl.json";

  /** Set true to enable some trace messages to help debugging. */
  export const trace = true;
}

/** Delimiters used when splitting text into individual words */
const wordDelimiters = [
  " ",
  "\t",
  "\r",
  "\n",
  "\r\n",
  ".",
  ",",
  ":",
  ";",
  "?",
  "!",
  "/",
  "\\",
  '"',
  "'",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "|",
  "*",
  "+",
  ""
];

/** Is true when performing a word search */
let searching: boolean = false;

/** After a word search, contains the list of matches with the same key */
let osloSearchItems: IOsloItem[];

/** Logs debug traces to the console, if enabled. */
function trace(text: string) {
  if (AppConfig.trace) {
    console.log(text);
  }
}

let woordenMetMatch = new Array<Word.Range>();
let wordsToIgnore = new Array<String>();
let shownResult = 0;
let documentContent = "";
let documentContentBackup = "/";
let typing = false;

/** Logs error messages to the console. */
function error(text: string) {
  console.error(text);
}

/** Office calls this onReady handler to initialize the plugin */
Office.onReady((info) => {
  // This add-in is intended to be loaded in Word (2016 Desktop or Online)
  if (info.host === Office.HostType.Word) {
    // Get the display language
    //const displayLanguage = Office.context.displayLanguage;
    //localize(displayLanguage);

    // Initialize element visibility, register event handlers
    document.getElementById("sideload-msg").style.display = "none";
    document.getElementById("app-body").style.display = "flex";

    document.getElementById("insertFootnote").onclick = onInsertFootnoteClicked;
    document.getElementById("insertEndnote").onclick = onInsertEndnoteClicked;
    document.getElementById("ignoreAll").onclick = ignoreAll;

    searching = false;

    

    // There's a bug in the office.js libraries, causing an exception in some browsers when 3rd party cookies are blocked. Notify the user why the plugin doesn't work.
    try {
      let s = window.sessionStorage;
    } catch (error) {
      //setResultText("De extensie kon niet correct worden geladen. Gelieve in de browser instellingen alle cookies toe te laten, en daarna de pagina te herladen.");
    }

    Word.run(async function (context) {

      document.getElementById("next").addEventListener("click", function () {
        if (shownResult < woordenMetMatch.length - 1) {
  
          shownResult++;
          document.getElementById("current_word").textContent = woordenMetMatch[shownResult].text.toLowerCase();
  
          const wordToSelect = woordenMetMatch[shownResult].getRange();
          wordToSelect.select();
          context.sync();
  
          document.getElementById("ResultBox").innerHTML = search(woordenMetMatch[shownResult].text.toLowerCase());
          document.getElementById("numResult").textContent = (shownResult + 1).toString();
        }

        changeNavButtonState();
  
    });

    document.getElementById("prev").addEventListener("click", function () {
      if (shownResult > 0) {
        shownResult--;

        document.getElementById("numResult").textContent = (shownResult + 1).toString();
        document.getElementById("current_word").textContent = woordenMetMatch[shownResult].text.toLowerCase();
        document.getElementById("ResultBox").innerHTML = search(woordenMetMatch[shownResult].text.toLowerCase());

        document.getElementById("prev").classList.remove("button--disabled");
        
      }
      
      changeNavButtonState();

      

  });
    
      while (1) {
        const range = context.document.body.getRange();
        range.load();
        await context.sync();
        documentContent = range.text;

        if (documentContent != documentContentBackup) searchInDocument();

        documentContentBackup = documentContent;

        await context.sync();
      }
    });

    initOsloCache(onCacheInitialized);
  }

  function onCacheInitialized() {
    trace("After init");
  }
});

function ignoreAll()
{
  Word.run(async function (context) {
    wordsToIgnore.push(woordenMetMatch[shownResult].text);
    context.sync();
    searchInDocument();
  });
}

function changeNavButtonState()
{
  if(shownResult == 0) document.getElementById("prev").classList.add("button--disabled");
  else document.getElementById("prev").classList.remove("button--disabled");

  if(shownResult == woordenMetMatch.length - 1) document.getElementById("next").classList.add("button--disabled");
  else document.getElementById("next").classList.remove("button--disabled");
      
}

export async function searchInDocument() {
  return Word.run(async function (context) {
    changeNavButtonState();
    shownResult = 0;

    // Wanneer het document veel woorden bevat, kan het laden even duren. Informeer de gebruiker:
    document.getElementById("ResultBox").innerHTML = "<img src='assets/loading.gif' height='50px'><br><br>Even geduld, uw tekst wordt geanalyseerd...";

    woordenMetMatch = new Array<Word.Range>();

    const range = context.document.body.getRange();
    range.load();
    await context.sync();

    // The document Range consists of a number of paragraph ranges
    let paragraph = range.paragraphs.getFirstOrNullObject();
    paragraph.load();
    await context.sync();

    let paragraphIndex = 0;

    while (!paragraph.isNullObject) {
      let words = paragraph.split(wordDelimiters, true /* trimDelimiters*/, true /* trimSpacing */);
      words.load();
      await context.sync().catch(function (error) {
        // If the paragraph is empty, the split throws an error
        words = null;
      });

      let wordList = new Array<Word.Range>();

      if (words && words.items) {
        for (let wordIndex = 0; wordIndex < words.items.length; wordIndex++) {
          const word = words.items[wordIndex];

          // Collect all the words in the paragraph, so we can search through them
          wordList.push(word);

          //						trace(`[${paragraphIndex} ${wordIndex}] ${word.text}`);
          await context.sync();
        }
      }

      

      // Search for dictionary words in the collected word list
      if (wordList.length > 0) {
        for (let k = 0; k < wordList.length; k++) {
          if (search(wordList[k].text.toLowerCase()) && !(wordsToIgnore.includes(wordList[k].text))) woordenMetMatch.push(wordList[k]);
        }
      }

      // Move to the next paragraph
      paragraph = paragraph.getNextOrNullObject();
      paragraph.load();
      await context.sync();
      paragraphIndex++;
    }

    if (woordenMetMatch.length >= 1) {
    

    document.getElementById("current_word").textContent = woordenMetMatch[shownResult].text.toLowerCase();
    document.getElementById("gevondenWoord").style.display = "";
    document.getElementById("tools").style.display = "block";
    document.getElementById("buttons").style.display = "";
    document.getElementById("ResultBox").innerHTML = search(woordenMetMatch[shownResult].text.toLowerCase());
    document.getElementById("numResult").textContent = (shownResult + 1).toString();
    document.getElementById("totalResult").textContent = woordenMetMatch.length.toString();

    
      document.getElementById("prev").style.display = "";
      

      document.getElementById("next").style.display = "";
      
    }
    else
    {
      document.getElementById("gevondenWoord").style.display = "none";
    document.getElementById("buttons").style.display = "none";
    document.getElementById("tools").style.display = "none";
      document.getElementById("ResultBox").innerHTML = "";
    }

    
    return context.sync();
  });
}

/** Click handler for the "Volgende Zoeken" button. */

/** Helper function to compare two numbers (for sorting) */
function compareInt(a: number, b: number): number {
  return a === b ? 0 : a > b ? 1 : -1;
}

/** Finds the next match from the Oslo dictionary in the given list of Words. Returns the match as an expanded Range, or null when there is no match. */
function findNextMatch(wordList: Array<Word.Range>): Word.Range {
  const lookup = getOsloDataMap();

  // Loop through all paragraph words to find a match
  for (let i = 0; i < wordList.length; i++) {
    const word = wordList[i];
    const wordText = word.text.toLowerCase();

    // For each word, see if we have a matching bucket (key = first word of the key phrase)
    let bucket = lookup.get(wordText);

    if (!bucket || bucket.length < 1) continue;

    trace("Bucket found: [" + wordText + "] #" + bucket.length);

    if (bucket.length > 1) {
      // If the bucket contains more than one match: sort the bucket so the longer key phrases come first, matching as much text as possible
      bucket.sort((a, b) => compareInt(b.numWords, a.numWords));
    }

    let n = 0;
    // Try all the key phrases in the bucket, to see if one matches
    for (let n = 0; n < bucket.length; n++) {
      let numWords = bucket[n].numWords;
      let keyphrase = bucket[n].keyphrase;

      if (numWords > wordList.length - i) continue; // Not enough words left to match the bucket key

      let phrase = "";

      // Join as many words from the paragraph as there are words in the bucket key
      for (let j = 0; j < numWords; j++) {
        phrase += phrase ? " " : "";
        phrase += wordList[i + j].text.toLowerCase();
      }

      trace("#words=" + numWords + " match '" + phrase + "' == '" + keyphrase + "' ?");

      // Check if the joined words match the bucket key
      if (keyphrase === phrase) {
        // They match. Create a Range for the matching words and return it (so we can select the words).
        return word.expandTo(wordList[i + numWords - 1]);
      }
    }
  }

  // Nothing found in the given word list (paragraph)
  return null;
}

/** Click handler for button to insert a footnote in the Word doc */
export async function onInsertFootnoteClicked() {
  return Word.run(async function (context) {
    const selection = context.document.getSelection();
    const rangeCollection = context.document.getSelection().getTextRanges([" "], true);
    rangeCollection.load();
    selection.load();
    await context.sync();

    const selectionToInsertAfter = rangeCollection.items[0]
      .getRange()
      .expandTo(rangeCollection.items[rangeCollection.items.length - 1].getRange());
    selectionToInsertAfter.select();
    insertNote(context, selection, selectionToInsertAfter, false /* useEndnote */);

    await context.sync();
  });
}

/** Click handler for button to insert a endnote in the Word doc */
export async function onInsertEndnoteClicked() {
  return Word.run(async function (context) {
    const selection = context.document.getSelection();
    const rangeCollection = context.document.getSelection().getTextRanges([" "], true);
    rangeCollection.load();
    selection.load();
    await context.sync();

    const selectionToInsertAfter = rangeCollection.items[0]
      .getRange()
      .expandTo(rangeCollection.items[rangeCollection.items.length - 1].getRange());
    selectionToInsertAfter.select();

    insertNote(context, selection, selectionToInsertAfter, true /* useEndnote */);

    await context.sync();
  });
}

/**
 * Inserts either a footnote or an endnote
 * @param context : the current Word context
 * @param selection : the current text selection (Range) in the Word doc
 * @param useEndnote : true to insert an endnote, false to insert a footnote
 */
function insertNote(
  context: Word.RequestContext,
  selection: Word.Range,
  selectionToInsertAfter: Word.Range,
  useEndnote: boolean
) {
  if (selection.isEmpty) {
    return; // Nothing selected, nothing to do
  }

  // The selection is a Range of markup, convert it to plain text so we can compare it
  const mainText = selection.text;

  if (osloSearchItems && osloSearchItems.length > 0) {
    let entry = osloSearchItems[0];

    // If there is more than one result, the user can select the entry to use for the note by checking a checkbox
    if (osloSearchItems.length > 1) {
      let i = 0;
      // Find out which checkbox was checked, and which entry to use
      for (const checkbox of getCheckBoxes()) {
        if (checkbox.checked) {
          entry = osloSearchItems[i];
          trace(`Item ${i} checked`);
          break;
        }
        i++;
      }
    }

    const noteText = createNoteText(entry.description, entry.reference);
    const xml = useEndnote ? createEndnoteXml(noteText) : createFootnoteXml(noteText);
    selectionToInsertAfter.insertOoxml(xml, "After");
  }
}

/** Cache for Oslo data items */
var osloLookupEntries: IOsloItem[];

/** An Oslo cache item */
interface IOsloItem {
  label: string;
  keyphrase: string;
  description: string;
  reference: string;
}

/** Maps the first word of Oslo key phrases to buckets (arrays) of tuples of {full key phrase, number of words}. */
var osloLookupMap: Map<string, IOsloBucketItem[]>;

/** An Oslo bucket item */
interface IOsloBucketItem {
  keyphrase: string;
  numWords: number;
}

function initOsloCache(afterCacheInitialized: () => void): void {
  // The first cache is a simple list of Oslo result items
  // Load the data from the web server. We're assuming a simple GET without authentication.
  httpRequest("GET", AppConfig.dataFileUrl)
    .then((json: string) => {
      if (!json) {
        error("Oslo data empty");
      }

      const data = JSON.parse(json);
      osloLookupEntries = parseOsloResult(data);

      // Sort the entries on keyphrase (case insensitive)
      osloLookupEntries = osloLookupEntries.sort((a, b) => a.keyphrase.localeCompare(b.keyphrase));

      // The second cache maps the first word of the item key phrase onto a bucket (array).
      // Each item in the bucket contains the full key phrase and the number of words in the key phrase.
      // This cache is used when searching through the Word text, matching any key phrases from the Oslo data set.
      osloLookupMap = new Map<string, IOsloBucketItem[]>();

      for (let osloEntry of osloLookupEntries) {
        // Split the key phrase to get the first word and the number of words
        let words = osloEntry.keyphrase.split(" ");
        let keyEntry = <IOsloBucketItem>{};
        keyEntry.keyphrase = osloEntry.keyphrase;
        keyEntry.numWords = words.length;

        // Store same first word items in the same cache bucket
        let list = osloLookupMap.get(words[0]);

        if (!list) {
          // Create a bucket if needed
          list = [];
          osloLookupMap.set(words[0], list);
        }

        list.push(keyEntry);
      }

      trace("OSLO data cache initialized, " + osloLookupEntries.length + " items, " + osloLookupMap.size + " buckets");
      afterCacheInitialized();
    })
    .catch((error) => {
      trace("Error: " + error);
    });
}

/** Returns the Oslo data list. Loads the data first if the cache is empty. */
function getOsloData(): IOsloItem[] {
  return osloLookupEntries;
}

function getOsloDataMap(): Map<string, IOsloBucketItem[]> {
  return osloLookupMap;
}

/** Looks up the given phrase in the OSLO database and returns the results via the given callback */
function osloLookup(phrase: string, useExactMatching: boolean): IOsloItem[] {
  if (!phrase) {
    return null;
  }

  phrase = phrase.toLowerCase().trim();

  const matches: IOsloItem[] = [];

  for (const item of getOsloData()) {
    if (useExactMatching) {
      if (item.keyphrase == phrase) {
        matches.push(item);
      }
    } else if (item.keyphrase.lastIndexOf(phrase) >= 0) {
      matches.push(item);
    }
  }

  return matches;
}

/** Asynchronously retrieves the string data response from the HTTP request for the given URL. */
async function httpRequest(verb: "GET" | "PUT", url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();

    // Callback after request.send()
    request.onload = function (event) {
      if (request.status === 200) {
        // HTTP request successful, resolve the promise with the response body
        resolve(request.response);
      } else {
        // HTTP request failed
        error(`Error after ${verb} from ${url} : ${request.status} ${request.statusText}`);
        resolve(null);
      }
    };

    request.open(verb, url, true /* async */);
    request.send();
  });
}

/** Parses the Oslo data, which is basically the raw JSON response of an Elasticsearch query on the Oslo terminology dataset. */
function parseOsloResult(elasticData: any): IOsloItem[] {
  let data: IOsloItem[] = [];

  if (elasticData && elasticData.hits && elasticData.hits.hits) {
    // Loop through all the Elasticsearch result items
    for (let item of elasticData.hits.hits) {
      item = item._source;
      // Convert the result items into our own objects
      let osloEntry: IOsloItem = {
        label: item.prefLabel ? item.prefLabel : "",
        keyphrase: item.prefLabel ? item.prefLabel.toLowerCase() : "",
        description: item.definition,
        reference: item.id,
      };
      // And store the data objects in a list
      if (osloEntry.keyphrase && osloEntry.description) {
        data.push(osloEntry);
      }
    }
  }
  return data;
}

/** Searches a given phrase in the OSLO data set. */
function search(searchPhrase: string) {
  const displayLanguage = Office.context.displayLanguage;

  // If the search phrase begins with an equals char, perform an exact match (otherwise a "contains" match)
  const exactMatch = searchPhrase.charAt(0) == "=";

  if (exactMatch) {
    // Remove the equals char from the search phrase
    searchPhrase = searchPhrase.substr(1);
  }

  // Search the phrase in the OSLO database
  const osloMatches = osloLookup(searchPhrase, exactMatch);

  osloSearchItems = osloMatches;

  var resultText = "";
  let numResults = osloMatches.length;

  if (numResults > 0) {
    // Render first 100 result items as keyphrase + description + reference link
    const numShown: number = numResults > 100 ? 100 : numResults;

    for (let i = 0; i < numShown; i++) {
      const item = osloMatches[i];

      resultText += createSearchResultItemHtml(i, numResults, item.label, item.description, item.reference);
    }

    // If we can't show all results, add a message
    if (numShown < numResults) {
      resultText +=
        displayLanguage.toLowerCase() === "en-us"
          ? `<b>First ${numShown} of ${numResults} results<br>.Please refine your search</b>`
          : `<b>Eerste ${numShown} van ${numResults} resultaten<br>Gelieve uw zoekopdracht te verfijnen.</b>`;
    }
  }

  // Add the search result HTML to the DOM
  //setResultText("<hr>" + (resultText ? resultText : displayLanguage.toLowerCase() === 'en-us' ? "Nothing found" : "Niets gevonden"));
  //setResultText("<hr>" + (resultText ? resultText : "Niets gevonden"));

  return resultText;
}

/** Creates the HTML text for one search result item. */
function createSearchResultItemHtml(
  index,
  numResults,
  keyphrase: string,
  description: string,
  referenceUrl: string
): string {
  let html = "";

  if (numResults > 1) {
    // If there is more than one result, add a checkbox before each item
    html += `<input type="checkbox" id="cb_osloitem_${index}">&nbsp;`;
  }

  keyphrase = escapeHtml(keyphrase);
  description = escapeHtml(description);
  let referenceUrlEscaped = escapeHtml(referenceUrl);

  html += `
		<b>${keyphrase}</b><p>
		${description}<p>
		<a href="${referenceUrl}" target="_blank">${referenceUrlEscaped}</a><p>
		<hr>`;

  return html;
}

/** Event handler for the checkbox click. */
export function onOsloItemClick(index: number): (this: GlobalEventHandlers, ev: MouseEvent) => any {
  return async function (event: MouseEvent) {
    // activeer invoegknoppen

    let i = 0;

    // Check the clicked checkbox, uncheck the others (radio-button behavior)
    for (const checkbox of getCheckBoxes()) {
      checkbox.checked = i === index;
      i++;
    }
  };
}

/** Sets the text in the search filter box. */
function setSearchText(text: string) {
  const input = <HTMLInputElement>document.getElementById("searchFilter");
  input.value = text;
  trace("setSearchText [" + text + "]");
}

/** Returns the text that has been entered in the search filter box. */
function getSearchText(): string {
  return (<HTMLInputElement>document.getElementById("searchFilter")).value.trim().toLowerCase();
}

/** Finds and returns all checkbox HTML elements, which are used to select one of the search results. */
function getCheckBoxes(): HTMLInputElement[] {
  const checkboxes: HTMLInputElement[] = [];

  const elements = document.getElementById("ResultBox").children;

  if (!elements) {
    return [];
  }

  for (let i = 0; i < elements.length; i++) {
    let element = elements[i];

    if (element instanceof HTMLInputElement) {
      checkboxes.push(element);
    }
  }

  return checkboxes;
}

/** Escape non alpha-numeric chars for safe inclusion in HTML */
function escapeHtml(text: string) {
  return text ? text.replace(/[^0-9A-Za-z ]/g, (char) => "&#" + char.charCodeAt(0) + ";") : "";
}

/** Create the OOXML text for the footnote/endnote text. */
function createNoteText(description: string, reference: string): string {
  description = escapeHtml(description + "\n");
  reference = escapeHtml(reference);

  let xml = `<w:t xml:space="preserve">${description} [${reference}]</w:t>`;
  return xml;
}

/** Creates the OOXML text needed to add a footnote to the Word document. */
function createFootnoteXml(noteText: string): string {
  // Note: the <?xml?> tag must be on the first line, or Word won't accept it (console error: Unhandled promise rejection)
  var xml: string = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
		<?mso-application progid="Word.Document"?>
		<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">
			<pkg:part pkg:name="/_rels/.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="512">
				<pkg:xmlData>
					<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
						<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml" />
					</Relationships>
				</pkg:xmlData>
			</pkg:part>

			<pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml">
				<pkg:xmlData>
					<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex wp14">
						<w:body>
							<w:p w:rsidR="00000000" w:rsidRDefault="00FD481E">
								<w:r w:rsidRPr="24EDB37C">
									<w:rPr>
										<w:rStyle w:val="FootnoteReference" />
										<w:rFonts w:ascii="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri" w:cs="Calibri" />
										<w:color w:val="333333" />
										<w:sz w:val="21" />
										<w:szCs w:val="21" />
									</w:rPr>
									<w:footnoteReference w:id="1" />
								</w:r>
							</w:p>
							<w:sectPr w:rsidR="00000000">
								<w:pgSz w:w="12240" w:h="15840" />
								<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0" />
								<w:cols w:space="720" />
							</w:sectPr>
						</w:body>
					</w:document>
				</pkg:xmlData>
			</pkg:part>

			<pkg:part pkg:name="/word/_rels/document.xml.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="256">
				<pkg:xmlData>
					<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
						<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml" />
						<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml" />
					</Relationships>
				</pkg:xmlData>
			</pkg:part>

			<pkg:part pkg:name="/word/footnotes.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml">
				<pkg:xmlData>
					<w:footnotes xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex wp14">
						<w:footnote w:type="separator" w:id="-1">
							<w:p w:rsidR="00FD481E" w:rsidRDefault="00FD481E">
								<w:pPr>
									<w:spacing w:after="0" w:line="240" w:lineRule="auto" />
								</w:pPr>
								<w:r>
									<w:separator />
								</w:r>
							</w:p>
						</w:footnote>
						<w:footnote w:type="continuationSeparator" w:id="0">
							<w:p w:rsidR="00FD481E" w:rsidRDefault="00FD481E">
								<w:pPr>
									<w:spacing w:after="0" w:line="240" w:lineRule="auto" />
								</w:pPr>
								<w:r>
									<w:continuationSeparator />
								</w:r>
							</w:p>
						</w:footnote>
						<w:footnote w:id="1">
							<w:p w:rsidR="00FD481E" w:rsidRDefault="00FD481E" w:rsidP="24EDB37C">
								<w:pPr>
									<w:pStyle w:val="FootnoteText" />
								</w:pPr>
								<w:r w:rsidRPr="24EDB37C">
									<w:rPr>
										<w:rStyle w:val="FootnoteReference" />
									</w:rPr>
									<w:footnoteRef />
								</w:r>
								<w:r>
									${noteText}
								</w:r>
							</w:p>

						</w:footnote>
					</w:footnotes>
				</pkg:xmlData>
			</pkg:part>

			<pkg:part pkg:name="/word/styles.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml">
				<pkg:xmlData>
					<w:styles xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex">
						<w:style w:type="character" w:styleId="FootnoteReference">
							<w:name w:val="footnote reference" />
							<w:basedOn w:val="DefaultParagraphFont" />
							<w:uiPriority w:val="99" />
							<w:semiHidden />
							<w:unhideWhenUsed />
							<w:rPr>
								<w:vertAlign w:val="superscript" />
							</w:rPr>
						</w:style>
						<w:style w:type="character" w:customStyle="1" w:styleId="FootnoteTextChar">
							<w:name w:val="Footnote Text Char" />
							<w:basedOn w:val="DefaultParagraphFont" />
							<w:link w:val="FootnoteText" />
							<w:uiPriority w:val="99" />
							<w:semiHidden />
							<w:rPr>
								<w:sz w:val="20" />
								<w:szCs w:val="20" />
							</w:rPr>
						</w:style>
						<w:style w:type="paragraph" w:styleId="FootnoteText">
							<w:name w:val="footnote text" />
							<w:basedOn w:val="Normal" />
							<w:link w:val="FootnoteTextChar" />
							<w:uiPriority w:val="99" />
							<w:semiHidden />
							<w:unhideWhenUsed />
							<w:pPr>
								<w:spacing w:after="0" w:line="240" w:lineRule="auto" />
							</w:pPr>
							<w:rPr>
								<w:sz w:val="20" />
								<w:szCs w:val="20" />
							</w:rPr>
						</w:style>
					</w:styles>
				</pkg:xmlData>
			</pkg:part>

		</pkg:package>`;

  return xml;
}

/** Creates the OOXML text needed to add an endnote to the Word document. */
function createEndnoteXml(noteText: string): string {
  // Note: the <?xml?> tag must be on the first line, or Word won't accept it (console error: Unhandled promise rejection)
  var xml: string = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
		<?mso-application progid="Word.Document"?>

		<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">
			<pkg:part pkg:name="/_rels/.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="512">
				<pkg:xmlData>
					<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
						<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml" />
					</Relationships>
				</pkg:xmlData>
			</pkg:part>

			<pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml">
				<pkg:xmlData>
					<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex wp14">
						<w:body>
							<w:p w:rsidR="00000000" w:rsidRDefault="00FD481E">
								<w:r w:rsidRPr="24EDB37C">
									<w:rPr>
										<w:rStyle w:val="EndnoteReference" />
									</w:rPr>
									<w:endnoteReference w:id="1" />
								</w:r>
							</w:p>
							<w:sectPr w:rsidR="00000000">
								<w:pgSz w:w="12240" w:h="15840" />
								<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:ender="720" w:gutter="0" />
								<w:cols w:space="720" />
							</w:sectPr>
						</w:body>
					</w:document>
				</pkg:xmlData>
			</pkg:part>

			<pkg:part pkg:name="/word/_rels/document.xml.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="256">
				<pkg:xmlData>
					<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
						<Relationship Id="rId1" Target="styles.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"/>
						<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" Target="endnotes.xml" />
					</Relationships>
				</pkg:xmlData>
			</pkg:part>

			<pkg:part pkg:name="/word/endnotes.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml">
				<pkg:xmlData>
					<w:endnotes xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex wp14">
						<w:endnote w:type="separator" w:id="-1">
							<w:p w:rsidR="00FD481E" w:rsidRDefault="00FD481E">
								<w:pPr>
									<w:spacing w:after="0" w:line="240" w:lineRule="auto" />
								</w:pPr>
								<w:r>
									<w:separator />
								</w:r>
							</w:p>
						</w:endnote>
						<w:endnote w:type="continuationSeparator" w:id="0">
							<w:p w:rsidR="00FD481E" w:rsidRDefault="00FD481E">
								<w:pPr>
									<w:spacing w:after="0" w:line="240" w:lineRule="auto" />
								</w:pPr>
								<w:r>
									<w:continuationSeparator />
								</w:r>
							</w:p>
						</w:endnote>
						<w:endnote w:id="1">
							<w:p>
								<w:pPr>
									<w:pStyle w:val="EndnoteText"/>
								</w:pPr>
								<w:r>
									<w:rPr>
										<w:rStyle w:val="EndnoteReference"/>
									</w:rPr>
									<w:endnoteRef/>
								</w:r>
								<w:r>
									${noteText}
								</w:r>
							</w:p>
						</w:endnote>
					</w:endnotes>
				</pkg:xmlData>
			</pkg:part>

			<pkg:part pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml" pkg:name="/word/styles.xml">
				<pkg:xmlData>
					<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
						<w:style w:default="1" w:styleId="Normal" w:type="paragraph">
							<w:name w:val="Normal"/>
							<w:qFormat/>
						</w:style>
						<w:style w:default="1" w:styleId="DefaultParagraphFont" w:type="character">
							<w:name w:val="Default Paragraph Font"/>
							<w:uiPriority w:val="1"/>
							<w:semiHidden/>
							<w:unhideWhenUsed/>
						</w:style>
						<w:style w:default="1" w:styleId="NoList" w:type="numbering">
							<w:name w:val="No List"/>
							<w:uiPriority w:val="99"/>
							<w:semiHidden/>
							<w:unhideWhenUsed/>
						</w:style>
						<w:style w:styleId="EndnoteText" w:type="paragraph">
							<w:name w:val="endnote text"/>
							<w:basedOn w:val="Normal"/>
							<w:link w:val="EndnoteTextChar"/>
							<w:uiPriority w:val="99"/>
							<w:semiHidden/>
							<w:unhideWhenUsed/>
							<w:rPr>
								<w:sz w:val="20"/>
								<w:szCs w:val="20"/>
							</w:rPr>
						</w:style>
						<w:style w:customStyle="1" w:styleId="EndnoteTextChar" w:type="character">
							<w:name w:val="Endnote Text Char"/>
							<w:basedOn w:val="DefaultParagraphFont"/>
							<w:link w:val="EndnoteText"/>
							<w:uiPriority w:val="99"/>
							<w:semiHidden/>
							<w:rPr>
								<w:sz w:val="20"/>
								<w:szCs w:val="20"/>
							</w:rPr>
						</w:style>
						<w:style w:styleId="EndnoteReference" w:type="character">
							<w:name w:val="endnote reference"/>
							<w:basedOn w:val="DefaultParagraphFont"/>
							<w:uiPriority w:val="99"/>
							<w:semiHidden/>
							<w:unhideWhenUsed/>
							<w:rPr>
								<w:vertAlign w:val="superscript"/>
							</w:rPr>
						</w:style>
					</w:styles>
				</pkg:xmlData>
			</pkg:part>

		</pkg:package>`;

  return xml;
}
