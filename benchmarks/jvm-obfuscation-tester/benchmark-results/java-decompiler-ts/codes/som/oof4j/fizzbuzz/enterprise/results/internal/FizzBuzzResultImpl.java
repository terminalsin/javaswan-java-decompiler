package codes.som.oof4j.fizzbuzz.enterprise.results.internal;

import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResult;

public class FizzBuzzResultImpl implements FizzBuzzResult {
  private final int flags;
  private final String representation;

  public FizzBuzzResultImpl(int number, String representation) {
    this.flags = number;
    this.representation = representation;
  }

  public int getNumber() {
    return this.flags;
  }

  public String getAsString() {
    return this.representation;
  }
}
