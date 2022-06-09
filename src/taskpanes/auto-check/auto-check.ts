/* eslint-disable no-undef */
import Vue from "vue";
import { OsloCache } from "../../oslo/OsloCache";
import root from "./pages/Root.vue";
const VlUiVueComponents = require("@govflanders/vl-ui-vue-components");
import { wordDelimiters } from "../../utils/WordDelimiters";
import { ignoredWords } from "../../utils/IgnoredWords";
import { IOsloItem } from "../../oslo/IOsloItem";

// configuration of the built-in validator
const validatorConfig = {
  inject: true,
  locale: "nl",
};

Vue.use(VlUiVueComponents, {
  validation: validatorConfig,
});

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    new Vue({
      el: "#app",
      render: (h) => h(root),
    });
  }
});

export async function searchDocument() {
  return await Word.run(async (context) => {
    const wordWithRangesMap = new Map<string, Word.Range[]>();

    const range = context.document.body.getRange();
    range.load();
    await context.sync();

    const osloInstance = await OsloCache.getInstance();

    let paragraph = range.paragraphs.getFirstOrNullObject();
    paragraph.load();
    await context.sync();

    while (!paragraph.isNullObject) {
      let ranges = paragraph.split(wordDelimiters, true /* trimDelimiters*/, true /* trimSpacing */);
      ranges.load();

      const wordList: Word.Range[] = [];

      await context.sync().catch(function (error) {
        // If the paragraph is empty, the split throws an error
        ranges = null;
      });

      if (ranges && ranges.items) {
        for (let word of ranges.items) {
          // Collect all the words in the paragraph, so we can search through them
          // We check if the 'word' is longer then 1 characters, if not don't include the word in the wordlist
          // We also check if the word is not in the list of excluded words
          if (
            word.text.length > 1 &&
            !ignoredWords.find((ignoredWord: string) => ignoredWord.toLowerCase() === word.text.toLowerCase())
          ) {
            wordList.push(word);
          }

          await context.sync();
        }
      }

      for (let word of wordList) {
        if (osloInstance.osloLookup(word.text, false).length > 0) {
          if (!wordWithRangesMap.has(word.text)) {
            wordWithRangesMap.set(word.text, []);
          }
          wordWithRangesMap.set(word.text, [...wordWithRangesMap.get(word.text), word]);
        }
      }

      paragraph = paragraph.getNextOrNullObject();
      paragraph.load();

      await context.sync();
    }

    return wordWithRangesMap;
  });
}

export async function getDefinitions(word: string): Promise<IOsloItem[]> {
  return (await OsloCache.getInstance()).osloLookup(word, false);
}

// This function expected the cursor to be at the beginning of the document
// TODO: add function to start at the current position or at the beginning of the document
export function selectWordInDocument(word: Word.Range) {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load();

    const results = context.document.body.search(word.text);
    context.load(results);

    await context.sync();

    let found = false;
    let index = 0;
    while (!found && index <= results.items.length - 1) {
      const position = results.items[index].compareLocationWith(selection);
      await context.sync();

      if (position.value === Word.LocationRelation.before) {
        index++;
        continue;
      }

      found = true;
      results.items[index].select();
    }

    await context.sync();
  });
}

export function selectNextWordInDocument(nextWord: Word.Range) {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load();

    const results = context.document.body.search(nextWord.text);
    context.load(results);

    await context.sync();

    if (results.items.length === 1) {
      results.items[0].select();
    } else {
      let found = false;
      let index = 0;

      while (index <= results.items.length && !found) {
        const position = results.items[index].compareLocationWith(selection);
        await context.sync();

        if (position.value !== Word.LocationRelation.after && position.value !== Word.LocationRelation.adjacentAfter) {
          index++;
          continue;
        }

        found = true;
        results.items[index].select();
      }
    }

    await context.sync();
  });
}

export function selectPreviousWordInDocument(previousWord: Word.Range) {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load();

    const results = context.document.body.search(previousWord.text);
    context.load(results);

    await context.sync();

    if (results.items.length === 1) {
      results.items[0].select();
    } else {
      let currentSelection = 0;
      let index = 1;
      let found = false;
      while (index <= results.items.length - 1 && !found) {
        const position = results.items[index].compareLocationWith(selection);
        await context.sync();

        if (
          position.value !== Word.LocationRelation.adjacentAfter &&
          position.value !== Word.LocationRelation.after &&
          position.value !== Word.LocationRelation.equal
        ) {
          currentSelection = index;
          index++;
          continue;
        }

        found = true;
        results.items[currentSelection].select();
      }

      if (!found) {
        results.items[index - 1].select();
      }
    }

    await context.sync();
  });
}