# frozen_string_literal: true

# Prototype harness. Not theme content. Delete before any real PR.
#
# Renders snippets/disclosure-jurisdiction-match.liquid with the stock Liquid gem against stub drops,
# and checks every row of the behaviour table documented in that snippet.
#
# Run: ruby .prototype/jurisdiction_harness.rb

require "liquid"

SNIPPET = File.join(__dir__, "..", "snippets", "disclosure-jurisdiction-match.liquid")

# The stock gem has no `{% doc %}` tag, which is a Shopify theme extension, so strip it.
SOURCE = File.read(SNIPPET).sub(/\{%\s*doc\s*%\}.*?\{%\s*enddoc\s*%\}\s*/m, "")

# Exercise the snippet the way the call sites do, so the capture and the `!= blank` test are covered
# rather than just the snippet's raw output. `render` isolates scope, so the caller cannot read an
# `assign` from inside the snippet; capture-around-render is Horizon's convention for this, used at
# sections/quick-order-list.liquid:338. The stock gem resolves `render` through a file system, so
# register the snippet under the name the theme uses.
CALL_SITE = <<~LIQUID
  {%- capture disclosure_visible -%}
    {%- render 'disclosure-jurisdiction-match', disclosure: disclosure -%}
  {%- endcapture -%}
  {%- if disclosure_visible != blank -%}SHOWN{%- else -%}HIDDEN{%- endif -%}
LIQUID

class SingleSnippetFileSystem
  def initialize(source)
    @source = source
  end

  def read_template_file(template_path)
    return @source if template_path == "disclosure-jurisdiction-match"

    raise Liquid::FileSystemError, "unexpected snippet: #{template_path}"
  end
end

# Shopify's `{% render %}` hides the caller's local variables but keeps theme globals such as
# `localization`, `product` and `settings` visible inside the snippet. In the stock gem the equivalent
# is `static_environments`, which `Liquid::Context#new_isolated_subcontext` carries into the isolated
# subcontext while `environments` is dropped. Passing `localization` as a plain assign therefore
# renders the snippet blind to the buyer, which is a property of this harness and not of the theme.
LIQUID_ENVIRONMENT = Liquid::Environment.build(file_system: SingleSnippetFileSystem.new(SOURCE))

class ValueDrop < Liquid::Drop
  def initialize(value)
    @value = value
  end

  def value
    @value
  end
end

class DisclosureDrop < Liquid::Drop
  def initialize(jurisdictions)
    @jurisdictions = jurisdictions
  end

  def jurisdictions
    ValueDrop.new(@jurisdictions)
  end
end

class CountryDrop < Liquid::Drop
  def initialize(iso_code)
    @iso_code = iso_code
  end

  def iso_code
    @iso_code
  end
end

class LocalizationDrop < Liquid::Drop
  def initialize(country:, subdivision:)
    @country = country
    @subdivision = subdivision
  end

  def country
    CountryDrop.new(@country)
  end

  def subdivision
    @subdivision
  end
end

TEMPLATE = Liquid::Template.parse(CALL_SITE, environment: LIQUID_ENVIRONMENT)

def visible?(jurisdictions:, country:, subdivision:)
  context = Liquid::Context.build(
    environment: LIQUID_ENVIRONMENT,
    environments: [{ "disclosure" => DisclosureDrop.new(jurisdictions) }],
    static_environments: {
      "localization" => LocalizationDrop.new(country: country, subdivision: subdivision),
    },
    rethrow_errors: true,
  )

  output = TEMPLATE.render!(context).strip

  case output
  when "SHOWN" then true
  when "HIDDEN" then false
  else raise "call site produced neither SHOWN nor HIDDEN: #{output.inspect}"
  end
end

# Cases marked NOTE record where a theme cannot reproduce a server-side check, either because Liquid
# has no regex or because the value has already been normalised before the theme sees it.
#
# [description, disclosure jurisdictions, buyer country, buyer subdivision, expected visible]
CASES = [
  ["All / any buyer",                      ["All"],        "DE", nil,  true],
  ["All / unknown country",                ["All"],        nil,  nil,  true],
  ["US / US, no subdivision",              ["US"],         "US", nil,  true],
  ["US / US-CA buyer",                     ["US"],         "US", "CA", true],
  ["US-CA / US, no subdivision (fail open)", ["US-CA"],    "US", nil,  true],
  ["US-CA / US-CA buyer",                  ["US-CA"],      "US", "CA", true],
  ["US-CA / US-TX buyer",                  ["US-CA"],      "US", "TX", false],
  ["US-CA / CA-BC buyer",                  ["US-CA"],      "CA", "BC", false],
  ["US / CA buyer",                        ["US"],         "CA", nil,  false],
  ["US-CA / unknown country (fail open)",  ["US-CA"],      nil,  nil,  true],
  ["empty jurisdiction list",              [],             "US", "TX", true],
  ["legacy value ['California']",          ["California"], "US", "TX", true],
  # Extra cases beyond the PR table, to pin behaviour the Ruby filter also has.
  ["multi-entry, one match",               ["CA-QC", "US-CA"], "US", "CA", true],
  ["multi-entry, no match",                ["CA-QC", "US-CA"], "US", "TX", false],
  ["lowercase input normalised",           ["us-ca"],      "us", "ca", true],
  ["mixed recognised and junk, no match",  ["California", "US-CA"], "US", "TX", false],
  # A stricter check would require two letters, not two characters. Liquid has no regex, so "U1" is
  # accepted as a country code here and the disclosure is hidden rather than failing open.
  ["NOTE: digit in country code",          ["U1"],         "US", "TX", false],
  # `localization.country` never returns blank, because the storefront substitutes the shop's backup
  # region when the buyer country cannot be resolved. An unresolved buyer on a US shop therefore
  # arrives here as a US buyer and CA-QC is hidden. That fallback is intended behaviour.
  ["NOTE: unresolved buyer reads as backup country", ["CA-QC"], "US", nil, false],
].freeze

passed = 0
failed = 0

CASES.each do |description, jurisdictions, country, subdivision, expected|
  actual = visible?(jurisdictions: jurisdictions, country: country, subdivision: subdivision)
  ok = actual == expected
  ok ? passed += 1 : failed += 1
  buyer = [country || "nil", subdivision || "nil"].join(" / ")
  printf(
    "%-4s %-42s jurisdictions=%-24s buyer=%-12s expected=%-5s actual=%s\n",
    ok ? "ok" : "FAIL",
    description,
    jurisdictions.inspect,
    buyer,
    expected,
    actual,
  )
end

puts
puts "#{passed} passed, #{failed} failed"
exit(failed.zero? ? 0 : 1)
