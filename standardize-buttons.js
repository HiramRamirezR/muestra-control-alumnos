// Button Standardization Script

document.addEventListener('DOMContentLoaded', function() {
    // Global Button Color Mapping
    const globalButtonColors = {
        'Crear Alumno': 'primary',
        'Buscar Alumno': 'purple',
        'Gestionar Familias': 'success',
        'Gestionar Pagos': 'info',
        'Ver Reportes': 'warning',
        'Reportes de Pagos': 'warning',
        'Cerrar sesión': 'danger'
    };

    // Navigation Buttons Configuration
    const navigationButtons = {
        'menu.html': {
            'Crear Alumno': { icon: 'fa-pen', color: 'primary' },
            'Buscar Alumno': { icon: 'fa-magnifying-glass', color: 'warning' },
            'Gestionar Familias': { icon: 'fa-users', color: 'success' },
            'Gestionar Pagos': { icon: 'fa-money-bill', color: 'info' },
            'Reportes de Pagos': { icon: 'fa-chart-simple', color: 'secondary' },
            'Ver Reportes': { icon: 'fa-file-chart-column', color: 'warning' },
            'Cerrar sesión': { icon: 'fa-person-running', color: 'danger' }
        },
        'formulario.html': {
            'Inicio': { icon: 'fa-house', color: 'secondary' },
            'Buscar alumno': { icon: 'fa-magnifying-glass', color: 'warning' },
            'Guardar cambios': { icon: 'fa-floppy-disk', color: 'success' },
            'PDF': { icon: 'fa-file-pdf', color: 'primary' }
        },
        'buscar-alumno.html': {
            'Inicio': { icon: 'fa-house', color: 'secondary' },
            'Crear alumno': { icon: 'fa-pen', color: 'primary' }
        },
        'gestionar-familias.html': {
            'Inicio': { icon: 'fa-house', color: 'secondary' },
            'Gestionar Pagos': { icon: 'fa-money-bill', color: 'info' },
            'Reportes de Pagos': { icon: 'fa-chart-simple', color: 'warning' },
            'Crear Familia': { icon: 'fa-plus', color: 'primary' },
            'Guardar Cambios': { icon: 'fa-save', color: 'success' }
        },
        'gestionar-pagos.html': {
            'Inicio': { icon: 'fa-house', color: 'secondary' },
            'Gestionar Familias': { icon: 'fa-people-group', color: 'success' },
            'Reportes de Pagos': { icon: 'fa-chart-simple', color: 'warning' },
            'Guardar': { icon: 'fa-save', color: 'primary' }
        },
        'reportes-pagos.html': {
            'Inicio': { icon: 'fa-house', color: 'secondary' },
            'Gestionar Familias': { icon: 'fa-people-group', color: 'success' },
            'Gestionar Pagos': { icon: 'fa-money-bill', color: 'info' },
            'Exportar a Excel': { icon: 'fa-file-excel', color: 'success' }
        }
    };

    const currentPage = window.location.pathname.split('/').pop();
    const pageButtons = navigationButtons[currentPage] || {};

    // Update buttons
    document.querySelectorAll('.btn').forEach(button => {
        const buttonText = button.textContent.trim();

        // Find matching color from global mapping or page-specific configuration
        const matchingColor =
            Object.entries(globalButtonColors).find(([text]) =>
                buttonText.toLowerCase().includes(text.toLowerCase())
            )?.[1] ||
            Object.entries(pageButtons).find(([text, config]) =>
                buttonText.toLowerCase().includes(text.toLowerCase())
            )?.[1]?.color;

        if (matchingColor) {
            // Remove existing color classes
            button.classList.remove(...['btn-primary', 'btn-secondary', 'btn-success', 'btn-danger', 'btn-warning', 'btn-info', 'btn-purple']);

            // Add new color class
            button.classList.add(`btn-${matchingColor}`);
        }

        // Add icons if not already present
        Object.entries(pageButtons).forEach(([text, config]) => {
            if (buttonText.toLowerCase().includes(text.toLowerCase()) && config.icon) {
                if (!button.querySelector('i')) {
                    const icon = document.createElement('i');
                    icon.classList.add('fas', config.icon);
                    button.insertBefore(icon, button.firstChild);
                }
            }
        });
    });
});
