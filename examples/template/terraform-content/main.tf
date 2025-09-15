module "${{ values.module }}" {
  source = "${{ values.moduleUrl }}?ref=${{ values.moduleRef }}"

{% for key, value in values.variables %}
  ${{ key }} = var.${{ key }}
{% endfor %}
}