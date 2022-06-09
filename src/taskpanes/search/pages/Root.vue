<template>
  <div>
    <vl-layout>
      <vl-title tag-name="h2"> Vraag het aan OSLO: </vl-title>
      <vl-grid mod-stacked>
        <vl-column>
          <vl-input-field
            id="search-input"
            mod-block
            v-model="input"
            @input="askOslo"
            placeholder="Geef minstens 3 letters in"
          />
        </vl-column>
        <vl-column width="6" v-if="result.length > 0">
          <vl-title tag-name="h5">{{ result.length }} resultaten</vl-title>
        </vl-column>
        <vl-column width="6" v-if="result.length > 0">
          <vl-checkbox v-model="showUrl" id="showUrlCheckbox" name="showUrlCheckbox" mod-switch>Toon URL</vl-checkbox>
        </vl-column>
        <vl-column width="12" v-for="(hit, index) of result" :key="`${hit.reference}-${index}`">
          <search-result-card
            :value="hit"
            :id="`radio-tile-${index}`"
            :title="hit.label"
            :description="hit.description"
            :url="hit.reference"
            :showUrl="showUrl"
          />
        </vl-column>
      </vl-grid>
    </vl-layout>
    <content-footer v-if="result.length > 0" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import EventBus from "../../../utils/EventBus";
import { search } from "../search";
import searchResultCard from "../../../general-components/search-result-card/search-result-card.vue";
import contentFooter from "../components/content-footer-search-pane.vue";
import { IOsloItem } from "src/oslo/IOsloItem";

export default Vue.extend({
  components: { searchResultCard, contentFooter },
  name: "root",
  data: () => {
    return {
      input: "",
      result: [] as IOsloItem[],
      show: false,
      showUrl: false
    };
  },
  methods: {
    askOslo() {
      if (this.input.length > 2) {
        search(this.input);
      } else {
        // When someone is removing characters and the string has a length lesser than or equal to 2
        // We reset the array
        this.result = [];
      }
    }
  },
  mounted() {
    EventBus.$on("onSearchResult", (data: IOsloItem[]) => {
      this.result = data;
    });

    EventBus.$on("onWordSelection", (data: string) => {
      this.input = data;
    });
  }
});
</script>

<style lang="scss">
@import "../css/style.scss";

body {
  overflow-x: hidden;
}

#ResultBox {
  margin-bottom: 80px;
}

/* width */
::-webkit-scrollbar {
  width: 10px;
} /* Track */
::-webkit-scrollbar-track {
  background: lightgrey;
  border-radius: 10px;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: grey;
  border-radius: 10px;
}

.slide-fade-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-leave-active {
  transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter, .slide-fade-leave-to /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(10px);
  opacity: 0;
}
</style>
