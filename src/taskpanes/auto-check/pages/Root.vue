<template>
  <vl-layout>
    <vl-grid mod-stacked v-if="status === ScanningStatus.NotScanned">
      <vl-column>
        <vl-introduction>
          Voer een documentscan uit om te kijken welke woorden uit je document gedefinieerd werden door OSLO
        </vl-introduction>
      </vl-column>
      <vl-column>
        <vl-action-group mod-align-center mod-collapse-s>
          <vl-button mod-wide @click="scan">Start scan</vl-button>
        </vl-action-group>
      </vl-column>
    </vl-grid>

    <loader v-if="status === ScanningStatus.Scanning" />

    <vl-grid mod-stacked v-if="status === ScanningStatus.DoneScanning">
      <scan-result-page :results="results" />
    </vl-grid>
  </vl-layout>
</template>

<script lang="ts">
import Vue from "vue";
import { searchDocument, getDefinitions, selectWordInDocument } from "../auto-check";
import searchResultCard from "../../../general-components/search-result-card/search-result-card.vue";
import contentFooter from "../components/content-footer-auto-check-pane.vue";
import loader from "../components/loader.vue";
import scanResultPage from "./ScanResultPage.vue";
import { IOsloItem } from "../../../oslo/IOsloItem";

export enum ScanningStatus {
  NotScanned,
  Scanning,
  DoneScanning
}

export default Vue.extend({
  name: "root",
  components: { searchResultCard, contentFooter, loader, scanResultPage },
  data: () => {
    return {
      ScanningStatus,
      status: ScanningStatus.NotScanned,
      resultIndex: 0,
      results: new Map<string, Word.Range[]>(),
      shownWord: {} as Word.Range,
      shownWordDefinitions: [] as IOsloItem[],
      selectedDefinition: {} as IOsloItem
    };
  },
  methods: {
    async scan() {
      this.status = ScanningStatus.Scanning;
      this.results = await searchDocument();
      this.status = ScanningStatus.DoneScanning;
    },
    next() {
      if (this.resultIndex + 1 <= this.results.length - 1) {
        this.resultIndex++;
        this.updateDisplayedWord();
      }
    },
    previous() {
      if (this.resultIndex - 1 >= 0) {
        this.resultIndex--;
        this.updateDisplayedWord();
      }
    },
    updateDisplayedWord() {
      this.shownWord = this.results[this.resultIndex];
      this.shownWordDefinitions = getDefinitions(this.shownWord);
    },
    selectShownWordInDocument() {
      selectWordInDocument(this.shownWord);
    }
  },
  watch: {
    shownWord(newValue) {
      selectWordInDocument(newValue);
    }
  }
});
</script>

<style lang="scss">
@import "../css/style.scss";

body {
  overflow-x: hidden;
}

#ResultBox {
  margin-bottom: 120px;
}

/* width */
::-webkit-scrollbar {
  width: 10px;
} /* Track */
::-webkit-scrollbar-track {
  background: lightgrey;
  border-radius: 10px;
} /* Handle */
::-webkit-scrollbar-thumb {
  background: grey;
  border-radius: 10px;
}
</style>
