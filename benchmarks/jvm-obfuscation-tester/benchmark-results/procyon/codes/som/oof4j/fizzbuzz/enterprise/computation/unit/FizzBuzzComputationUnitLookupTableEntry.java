package codes.som.oof4j.fizzbuzz.enterprise.computation.unit;

public enum FizzBuzzComputationUnitLookupTableEntry {
  N_LITERAL((String) null),
  FIZZ("Fizz"),
  BUZZ("Buzz"),
  FIZZ_BUZZ("Fizz Buzz");

  private final String name;

  private FizzBuzzComputationUnitLookupTableEntry(final String name) {
    this.name = name;
  }

  @Override
  public String toString() {
    return this.name;
  }
}
