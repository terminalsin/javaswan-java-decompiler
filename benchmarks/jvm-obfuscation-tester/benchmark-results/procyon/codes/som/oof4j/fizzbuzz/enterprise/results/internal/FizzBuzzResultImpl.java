package codes.som.oof4j.fizzbuzz.enterprise.results.internal;

import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResult;

public class FizzBuzzResultImpl implements FizzBuzzResult {
  private final int flags;
  private final String representation;

  public FizzBuzzResultImpl(final int number, final String representation) {
    this.flags = number;
    this.representation = representation;
  }

  @Override
  public int getNumber() {
    return this.flags;
  }

  @Override
  public String getAsString() {
    return this.representation;
  }
}
