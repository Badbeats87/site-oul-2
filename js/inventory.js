// Inventory Management Interactions

document.addEventListener('DOMContentLoaded', function() {
    // Checkbox selection
    const checkboxAll = document.querySelector('.checkbox-all');
    const checkboxItems = document.querySelectorAll('.checkbox-item');
    const bulkActionsBar = document.querySelector('.bulk-actions-bar');
    const bulkCount = document.querySelector('.bulk-count');

    // Select all functionality
    if (checkboxAll) {
        checkboxAll.addEventListener('change', function() {
            checkboxItems.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateBulkActions();
        });
    }

    // Individual checkbox selection
    checkboxItems.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateBulkActions();

            // Update "select all" checkbox state
            const allChecked = Array.from(checkboxItems).every(cb => cb.checked);
            const someChecked = Array.from(checkboxItems).some(cb => cb.checked);

            if (checkboxAll) {
                checkboxAll.checked = allChecked;
                checkboxAll.indeterminate = someChecked && !allChecked;
            }

            // Highlight row
            this.closest('tr').classList.toggle('selected', this.checked);
        });
    });

    // Update bulk actions bar visibility and count
    function updateBulkActions() {
        const selectedCount = document.querySelectorAll('.checkbox-item:checked').length;

        if (selectedCount > 0) {
            bulkActionsBar.style.display = 'flex';
            bulkCount.textContent = selectedCount + ' item' + (selectedCount !== 1 ? 's' : '') + ' selected';
        } else {
            bulkActionsBar.style.display = 'none';
        }
    }

    // Filter and search functionality
    const searchInput = document.querySelector('.search-input');
    const filterSelects = document.querySelectorAll('.filter-select');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterInventory();
        });
    }

    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            filterInventory();
        });
    });

    function filterInventory() {
        // This is a placeholder for actual filtering logic
        // In a real application, this would filter/search the inventory table
        console.log('Filtering inventory...');
    }

    // Edit button handlers
    const editButtons = document.querySelectorAll('.button--secondary:has-child');
    document.querySelectorAll('td .button--secondary').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const row = this.closest('tr');
            const albumInfo = row.querySelector('.album-info strong').textContent;
            // In a real app, this would open an edit modal or navigate to edit page
            console.log('Edit clicked for:', albumInfo);
        });
    });
});
