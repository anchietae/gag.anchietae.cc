<script lang="ts">
  import Footer from '$lib/components/Footer.svelte';
  import "../app.css";
</script>

<div class="container">
  <div class="content">
    <slot />
    <Footer />
  </div>
</div>

<style>
  .container {
    display: grid;
  }
  .content {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    position: relative;
  }
  @media (width < 52.5rem) {
    .container {
      grid-template-rows: 1fr auto;
      --m3-util-bottom-offset: 5rem;
    }
  }
  @media (width >= 52.5rem) {
    .container {
      grid-template-columns: auto 1fr;
    }
    .content {
      padding: 1.5rem;
      grid-column: 2;
    }
  }
</style>