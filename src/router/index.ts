import { createRouter, createWebHashHistory } from 'vue-router'
import NotFoundView from '../views/NotFoundView.vue'
import QuoteEditView from '../views/QuoteEditView.vue'
import QuoteListView from '../views/QuoteListView.vue'
import TestDocsView from '../views/TestDocsView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'list', component: QuoteListView },
    { path: '/quotes/:id', name: 'quote', component: QuoteEditView },
    { path: '/tests', name: 'tests', component: TestDocsView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})

export default router
