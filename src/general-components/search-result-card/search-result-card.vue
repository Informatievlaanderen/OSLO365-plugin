<template>
  <span v-vl-spacer:bottom>
    <vl-info-tile
      style="word-break: break-word"
      class="hvr-grow-shadow spacer"
      id="search-result"
      tag-name="div"
      :title="title"
      :subtitle="showUrl === true ? url : ''"
      v-vl-border
    >
      <vl-grid>
        <vl-column>
          <p>{{ description }}</p>
        </vl-column>
        <vl-column>
          <vl-link id="addLink" v-vl-flex v-vl-flex:align-flex-end mod-bold> Voeg toe </vl-link>
        </vl-column>
      </vl-grid>
    </vl-info-tile>
  </span>
</template>

<script lang="ts">
import Vue from "vue";
export default Vue.extend({
  props: {
    value: {
      type: Object,
      default: () => {}
    },
    id: {
      type: String,
      default: "radio-tile"
    },
    title: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    url: {
      type: String,
      default: ""
    },
    showUrl: {
      type: Boolean,
      default: false
    }
  },
  data: () => {
    return {};
  }
});
</script>

<style lang="scss">
@import "./style.scss";

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
