<template>
  <vl-layout>
    <vl-grid mod-stacked>
      <vl-column>
        <vl-loader message="Document wordt gescand en resultaten worden geladen" />
      </vl-column>
      <vl-column>
        <p>Voor {{ numberOfResults }} woorden definities gevonden in OSLO</p>
      </vl-column>
    </vl-grid>
  </vl-layout>
</template>

<script lang="ts">
import EventBus from "../../../utils/EventBus";
import Vue from "vue";
export default Vue.extend({
  name: "loader",
  data: () => {
    return {
      numberOfResults: 0
    };
  },
  mounted() {
    EventBus.$on("definitionsFound", () => {
      this.numberOfResults++;
    });
  }
});
</script>
