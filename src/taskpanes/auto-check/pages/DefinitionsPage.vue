<template>
  <vl-grid mod-stacked>
    <vl-column width="3">
      <vl-button id="backButton" @click="resetTerm" icon="arrow-left" mod-icon mod-naked mod-naked-action />
    </vl-column>
    <vl-column width="9">
      <vl-title tag-name="h3">
        Definities voor <span v-vl-mark>{{ term }}</span>
      </vl-title>
    </vl-column>
    <vl-column>
      <search-result-card
        v-for="(hit, index) of termDefinitions"
        :key="`${hit.reference}-${index}`"
        :value="hit"
        :id="`radio-tile-${index}`"
        :title="hit.label"
        :description="hit.description"
        :url="hit.reference"
      />
    </vl-column>
  </vl-grid>
</template>

<script lang="ts">
import Vue from "vue";
import { getDefinitions } from "../auto-check";
import searchResultCard from "../../../general-components/search-result-card/search-result-card.vue";
import EventBus from "../../../utils/EventBus";

export default Vue.extend({
  components: { searchResultCard },
  props: {
    term: {
      type: String,
      default: ""
    }
  },
  methods: {
    resetTerm() {
      EventBus.$emit("resetTerm");
    }
  },
  computed: {
    termDefinitions() {
      console.log(this.term);
      const test = getDefinitions(this.term);
      console.log(test);
      return getDefinitions(this.term);
    }
  }
});
</script>

<style lang="scss">
#backButton {
  cursor: pointer;
}
</style>
