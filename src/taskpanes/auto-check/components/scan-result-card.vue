<template>
  <span v-vl-spacer:bottom>
    <vl-info-tile
      style="word-break: break-word"
      class="hvr-grow-shadow spacer"
      id="search-result"
      tag-name="div"
      :title="value"
      v-vl-border
    >
      <vl-grid>
        <vl-column>
          <vl-link id="addLink" v-vl-flex v-vl-flex:align-flex-end mod-bold @click="showDefinitions">
            Toon definities
          </vl-link>
        </vl-column>
      </vl-grid>
    </vl-info-tile>
  </span>
</template>

<script lang="ts">
import Vue from "vue";
import EventBus from "../../../utils/EventBus";
import { getDefinitions } from "../auto-check";
export default Vue.extend({
  props: {
    value: {
      type: String,
      default: ""
    }
  },
  methods: {
    async showDefinitions() {
      EventBus.$emit("showDefinitions", this.value);

      const definitions = await getDefinitions(this.value);
      EventBus.$emit("definitions", definitions);
    }
  }
});
</script>

<style lang="scss">
#addLink {
  cursor: pointer;
}

.spacer {
  margin-bottom: 0.5em;
}

.hvr-grow-shadow {
  display: inline-block;
  vertical-align: middle;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  box-shadow: 0 0 1px rgba(0, 0, 0, 0);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -moz-osx-font-smoothing: grayscale;
  -webkit-transition-duration: 0.3s;
  transition-duration: 0.3s;
  -webkit-transition-property: box-shadow, transform;
  transition-property: box-shadow, transform;
}
.hvr-grow-shadow:hover,
.hvr-grow-shadow:focus,
.hvr-grow-shadow:active {
  box-shadow: 10px 10px 5px rgba(0, 0, 0, 0.2);
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>
