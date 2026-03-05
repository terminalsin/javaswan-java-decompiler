package dev.sim0n.iridium.collection.map;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class ClassToInstanceMapBuilder<T> {
  private final Map<Class<?>, T> map = new HashMap<>();

  public ClassToInstanceMapBuilder<T> put(T instance) {
    this.map.put(instance.getClass(), instance);
    return this;
  }

  public ClassToInstanceMapBuilder<T> build() {
    return this;
  }

  public <Type extends T> Type getInstance(Class<Type> clazz) {
    return clazz.cast(this.map.get(clazz));
  }

  public Collection<T> values() {
    return this.map.values();
  }

  public Map<Class<?>, T> getMap() {
    return this.map;
  }
}
