<template>
  <vl-layout>
    <vl-grid mod-stacked v-if="selectedTerm === ''">
      <vl-column>
        <vl-title tag-name="h2">Volgende woorden hebben één of meerdere definities in OSLO:</vl-title>
      </vl-column>
      <vl-column v-for="(term, index) in Array.from(results.keys())" :key="index">
        <scan-result-card :value="term" />
      </vl-column>
    </vl-grid>

    <definitions-page :term="selectedTerm" v-else />
  </vl-layout>
</template>

<script lang="ts">
import Vue from "vue";
import EventBus from "../../../utils/EventBus";
import DefinitionsPage from "./DefinitionsPage.vue";
import ScanResultCard from "../components/scan-result-card.vue";

export default Vue.extend({
  components: { DefinitionsPage, ScanResultCard },
  props: {
    results: {
      type: Map,
      default: new Map()
    }
  },
  data: () => {
    return {
      selectedTerm: ""
    };
  },
  methods: {
  },
  mounted() {
    EventBus.$on("resetTerm", () => {
      this.selectedTerm = "";
    });

    EventBus.$on("showDefinitions", (name: string) => {
      this.selectedTerm = name;
    });
  }
});
</script>

<style lang="scss">
#ResultBox {
  margin-bottom: 80px;
} /* width */
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
.slide-fade-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-leave-active {
  transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter, .slide-fade-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(10px);
  opacity: 0;
}

#termButton:hover {
  cursor: pointer;
}
</style>
