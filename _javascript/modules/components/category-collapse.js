/**
 * Tab 'Categories' expand/close effect.
 */

import 'bootstrap/js/src/collapse.js';

const childPrefix = 'l_';
const parentPrefix = 'h_';
const children = document.getElementsByClassName('collapse');

export function categoryCollapse() {
  [...children].forEach((elem) => {
    const id = parentPrefix + elem.id.substring(childPrefix.length);
    const parent = document.getElementById(id);

    // collapse sub-categories
    elem.addEventListener('hide.bs.collapse', () => {
      if (parent) {
        const folder = parent.querySelector('.far.fa-folder-open');
        const arrow = parent.querySelector('.fas.fa-angle-down');

        if (folder) {
          folder.className = 'far fa-folder fa-fw';
        }

        if (arrow) {
          arrow.classList.add('rotate');
        }

        parent.classList.remove('hide-border-bottom');
      }
    });

    // expand sub-categories
    elem.addEventListener('show.bs.collapse', () => {
      if (parent) {
        const folder = parent.querySelector('.far.fa-folder');
        const arrow = parent.querySelector('.fas.fa-angle-down');

        if (folder) {
          folder.className = 'far fa-folder-open fa-fw';
        }

        if (arrow) {
          arrow.classList.remove('rotate');
        }

        parent.classList.add('hide-border-bottom');
      }
    });
  });
}
